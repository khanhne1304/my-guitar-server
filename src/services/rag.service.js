import Product from '../models/Product.js';
import { pipeline } from '@xenova/transformers';
import { isCompanyQuery, answerCompanyQuestion } from '../data/companyInfo.js';

// Simple in-memory vector store for product recommendation
const state = {
	model: null,
	initializing: false,
	ready: false,
	items: [], // [{ id, slug, name, description, price, currency }]
	vectors: null, // Float32Array flat, length = items.length * dim
	dim: 384, // default for all-MiniLM-L6-v2
};

function textForEmbedding(item) {
	const parts = [
		item.name || '',
		item.description || '',
		item.brandName ? `Thương hiệu: ${item.brandName}` : '',
		item.categoryName ? `Danh mục: ${item.categoryName}` : '',
		item.type ? `Loại: ${item.type}` : '',
	];
	return parts.filter(Boolean).join('\n');
}

async function ensureModel() {
	if (state.model) return state.model;
	if (state.initializing) {
		// wait until initialized by another request
		while (state.initializing) {
			// eslint-disable-next-line no-await-in-loop
			await new Promise((r) => setTimeout(r, 200));
		}
		return state.model;
	}
	state.initializing = true;
	try {
		// all-MiniLM-L6-v2 is small and fast; works decently for vi
		state.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
		state.dim = 384;
		return state.model;
	} finally {
		state.initializing = false;
	}
}

function normalizeVector(vec) {
	let norm = 0;
	for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
	norm = Math.sqrt(norm) || 1;
	for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
	return vec;
}

function dot(a, b) {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += a[i] * b[i];
	return s;
}

function toNumberSafe(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		// remove all non-digits
		const digits = value.replace(/[^\d]/g, '');
		if (!digits) return null;
		const n = Number(digits);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function effectivePrice(price) {
	if (!price) return null;
	const baseNum = toNumberSafe(price.base);
	const saleNum = toNumberSafe(price.sale);
	return saleNum ?? baseNum;
}

export async function buildProductIndex() {
	await ensureModel();
	// Fetch minimal product fields
	const products = await Product.find({ isActive: true })
		.select('name description slug price brand category attributes')
		.populate('brand category', 'name');

	state.items = products.map((p) => ({
		id: String(p._id),
		slug: p.slug,
		name: p.name,
		description: p.description || '',
		price: effectivePrice(p.price),
		currency: (p.price && p.price.currency) || 'VND',
		brandName: p.brand?.name,
		categoryName: p.category?.name,
		type: p.attributes?.type,
	}));

	// Embed all items
	const texts = state.items.map((it) => textForEmbedding(it));
	const batchSize = 32;
	const all = new Float32Array(state.items.length * state.dim);
	for (let i = 0; i < texts.length; i += batchSize) {
		// eslint-disable-next-line no-await-in-loop
		const outputs = await state.model(texts.slice(i, i + batchSize), {
			pooling: 'mean',
			normalize: true,
		});
		// outputs is a Tensor-like; ensure Float32Array
		const chunk = Array.isArray(outputs) ? outputs : [outputs];
		for (let j = 0; j < chunk.length; j++) {
			const emb = chunk[j].data ? chunk[j].data : chunk[j];
			const vec = emb instanceof Float32Array ? emb : Float32Array.from(emb);
			// vec already normalized when normalize:true, but safeguard
			normalizeVector(vec);
			all.set(vec, (i + j) * state.dim);
		}
	}
	state.vectors = all;
	state.ready = true;
	return { count: state.items.length, dim: state.dim };
}

export function isIndexReady() {
	return state.ready && state.items.length > 0 && state.vectors;
}

export function invalidateProductIndex() {
	// Mark current in-memory index as dirty; sẽ build lại ở lần truy vấn tiếp theo
	state.items = [];
	state.vectors = null;
	state.ready = false;
}

async function embedQuery(text) {
	await ensureModel();
	const out = await state.model(text, { pooling: 'mean', normalize: true });
	const vec = out.data ? out.data : out;
	const v = vec instanceof Float32Array ? vec : Float32Array.from(vec);
	return normalizeVector(v);
}

export async function retrieveProducts({ query, k = 8, budgetMin, budgetMax }) {
	if (!isIndexReady()) {
		await buildProductIndex();
	}
	const qv = await embedQuery(query);
	const scores = [];
	for (let i = 0; i < state.items.length; i++) {
		const start = i * state.dim;
		const v = state.vectors.subarray(start, start + state.dim);
		const s = dot(qv, v); // cosine since both normalized
		scores.push([i, s]);
	}
	// Filter by budget if provided
	const hasBudget = Number.isFinite(budgetMin) || Number.isFinite(budgetMax);
	const filtered = hasBudget
		? scores.filter(([idx]) => {
				const price = state.items[idx].price;
				if (price == null) return false;
				if (Number.isFinite(budgetMin) && price < budgetMin) return false;
				if (Number.isFinite(budgetMax) && price > budgetMax) return false;
				return true;
		  })
		: scores;
	filtered.sort((a, b) => b[1] - a[1]);
	const top = filtered.slice(0, k).map(([idx, score]) => ({
		score,
		...state.items[idx],
	}));
	return top;
}

function formatContext(products) {
	return products
		.map(
			(p, i) =>
				`[${i + 1}] ${p.name}\nGiá: ${p.price?.toLocaleString('vi-VN')} ${p.currency}\nDanh mục: ${p.categoryName || '-'}; Thương hiệu: ${p.brandName || '-'}\nSlug: ${p.slug}`,
		)
		.join('\n\n');
}

function detectInstruments(text) {
	const t = String(text || '').toLowerCase();
	const map = {
		guitar: ['guitar', 'đàn guitar'],
		ukulele: ['ukulele', 'uke'],
		organ: ['organ', 'keyboard'],
		violin: ['violin', 'đàn violin'],
		drum: ['trống', 'drum'],
	};
	const found = [];
	for (const [key, kws] of Object.entries(map)) {
		if (kws.some((kw) => t.includes(kw))) found.push(key);
	}
	return found;
}

function matchesInstrument(item, instruments) {
	if (!instruments?.length) return true;
	const name = (item.name || '').toLowerCase();
	const desc = (item.description || '').toLowerCase();
	const cat = (item.categoryName || '').toLowerCase();
	const type = (item.type || '').toLowerCase();
	return instruments.some((inst) => {
		return (
			cat.includes(inst) ||
			type.includes(inst) ||
			name.includes(inst) ||
			desc.includes(inst)
		);
	});
}

async function callOllamaChat({ system, prompt, model }) {
	const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
	const body = {
		model: model || process.env.OLLAMA_MODEL || 'qwen2.5:3b',
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: prompt },
		],
		stream: false,
	};
	const res = await fetch(`${host}/api/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Ollama error ${res.status}`);
	const data = await res.json();
	// data.message.content in newer versions; fallback to data.response for /generate
	return data?.message?.content || data?.response || '';
}

export async function answerQuestion({ message, budgetMin, budgetMax, k = 6 }) {
	// Company FAQ early exit
	if (isCompanyQuery(message)) {
		return { answer: answerCompanyQuestion(message), items: [] };
	}

	// Instrument-aware retrieval
	const instruments = detectInstruments(message);
	let retrieved = await retrieveProducts({
		query: message,
		k: Math.max(k, 12),
		budgetMin: Number.isFinite(budgetMin) ? budgetMin : undefined,
		budgetMax: Number.isFinite(budgetMax) ? budgetMax : undefined,
	});
	if (instruments.length) {
		const filtered = retrieved.filter((it) => matchesInstrument(it, instruments));
		if (filtered.length >= Math.min(3, k)) {
			retrieved = filtered.slice(0, k);
		} else {
			const more = await retrieveProducts({
				query: `${message} ${instruments.join(' ')}`,
				k: 40,
				budgetMin: Number.isFinite(budgetMin) ? budgetMin : undefined,
				budgetMax: Number.isFinite(budgetMax) ? budgetMax : undefined,
			});
			const again = more.filter((it) => matchesInstrument(it, instruments));
			if (again.length === 0) {
				return {
					answer: 'Xin lỗi, không có sản phẩm phù hợp với nhu cầu/ngân sách của bạn.',
					items: [],
				};
			}
			retrieved = again.slice(0, k);
		}
	} else {
		retrieved = retrieved.slice(0, k);
	}

	// If user has budget constraints and nothing fits, return apology instead of off-budget suggestions
	if (retrieved.length === 0 && (Number.isFinite(budgetMin) || Number.isFinite(budgetMax))) {
		return {
			answer: 'Xin lỗi, không có sản phẩm phù hợp với nhu cầu/ngân sách của bạn.',
			items: [],
		};
	}

	// Guard for nonsense queries: nếu không phát hiện loại nhạc cụ và độ tương đồng rất thấp
	if (retrieved.length === 0) {
		return {
			answer: 'Xin lỗi, không có sản phẩm phù hợp với nhu cầu/ngân sách của bạn.',
			items: [],
		};
	}
	if (!instruments.length) {
		const topScore = retrieved?.[0]?.score ?? 0;
		if (topScore < 0.1) {
			return {
				answer: 'Xin lỗi, không có sản phẩm phù hợp với nhu cầu/ngân sách của bạn.',
				items: [],
			};
		}
	}

	const ctx = formatContext(retrieved);
	const sys =
		'Bạn là trợ lý tư vấn sản phẩm nhạc cụ. Trả lời bằng tiếng Việt, ngắn gọn, chỉ dựa vào CONTEXT. Luôn ưu tiên đúng loại nhạc cụ người dùng hỏi. Nếu có ngân sách, CHỈ gợi ý trong khoảng ngân sách; nếu không có sản phẩm phù hợp thì nói: "Xin lỗi, không có sản phẩm phù hợp nhu cầu của bạn."';
	const prompt =
		`CÂU HỎI: ${message}\n\nCONTEXT (Danh sách ứng viên):\n${ctx}\n\nYÊU CẦU: Đề xuất 3 sản phẩm phù hợp nhất với câu hỏi/ngân sách (nếu có). Trình bày gọn, nêu tên và giá.`;

	// Try local Ollama (optional). If unavailable, fallback to a templated answer.
	let answer;
	try {
		answer = await callOllamaChat({ system: sys, prompt });
	} catch {
		const items = retrieved.slice(0, 3);
		answer =
			items.length === 0
				? 'Hiện chưa tìm thấy sản phẩm phù hợp trong tầm giá hoặc yêu cầu.'
				: `Gợi ý nhanh:\n` +
				  items
						.map(
							(p, i) =>
								`${i + 1}. ${p.name} — ${p.price?.toLocaleString('vi-VN')} ${p.currency} (/${p.slug})`,
						)
						.join('\n');
	}

	return {
		answer,
		items: retrieved, // return for UI listing
	};
}


