// RAG service xây dựng theo kiến trúc LangChain (Retrieval-Augmented Generation)
// - Embeddings: HuggingFace (Xenova/all-MiniLM-L6-v2) chạy local
// - Vector store: FAISS
// - LLM sinh câu trả lời: Google Gemini (ChatGoogleGenerativeAI)
// - Bộ nhớ hội thoại: ConversationBuffer theo sessionId
// - Chuỗi: history-aware retriever + stuff documents (ConversationalRetrievalChain)
// Nguồn tri thức: sản phẩm trong MongoDB + tài liệu (.txt/.md) + thông tin công ty
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Product from '../models/Product.js';
import { companyInfo } from '../data/companyInfo.js';

import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, '../data/knowledge');

const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
const CHAT_MODEL =
	process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_HISTORY_TURNS = 8; // số lượt hội thoại tối đa lưu lại cho mỗi phiên
// Ngưỡng độ tương đồng (cosine). Dưới ngưỡng -> coi như không liên quan,
// KHÔNG gợi ý sản phẩm (vd: gõ từ vô nghĩa, hỏi lạc đề).
const MIN_PRODUCT_SCORE = Number(process.env.RAG_MIN_SCORE ?? 0.35);
// Ngưỡng để đưa tài liệu (công ty/knowledge) vào ngữ cảnh trả lời.
const CONTEXT_MIN_SCORE = Number(process.env.RAG_CONTEXT_MIN_SCORE ?? 0.25);
// Giới hạn tốc độ sinh: ít token hơn = phản hồi nhanh hơn.
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 600);
const NO_MATCH_ANSWER = 'Xin lỗi, mình chưa có thông tin phù hợp với yêu cầu của bạn.';

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của cửa hàng nhạc cụ GuitarMaster.
Trả lời bằng tiếng Việt, thân thiện, ngắn gọn và CHỈ dựa vào thông tin trong phần CONTEXT bên dưới.
- Nếu câu hỏi về sản phẩm: ưu tiên đúng loại nhạc cụ và đúng khoảng ngân sách (nếu có); đề xuất tối đa 3 sản phẩm phù hợp nhất, nêu rõ tên và giá.
- Nếu câu hỏi về cửa hàng (địa chỉ, hotline, chính sách...): trả lời dựa trên thông tin công ty trong CONTEXT.
- Nếu không tìm thấy thông tin phù hợp trong CONTEXT, hãy nói: "Xin lỗi, mình chưa có thông tin phù hợp với yêu cầu của bạn."
Tuyệt đối không bịa thông tin nằm ngoài CONTEXT.

CONTEXT:
{context}`;

// ===== Trạng thái dùng chung =====
const state = {
	embeddings: null,
	vectorStore: null,
	llm: null,
	combineChainPromise: null, // cache chuỗi sinh câu trả lời
	ready: false,
	building: null, // promise lock khi đang build index
};

// Bộ nhớ hội thoại: sessionId -> mảng BaseMessage (ConversationBufferMemory)
const histories = new Map();

// ===== Tiện ích =====
function toNumberSafe(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
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

function getEmbeddings() {
	if (state.embeddings) return state.embeddings;
	state.embeddings = new HuggingFaceTransformersEmbeddings({ model: EMBEDDING_MODEL });
	return state.embeddings;
}

function getLLM() {
	if (state.llm) return state.llm;
	const apiKey = String(
		process.env.GEMINI_API_KEY ||
			process.env.GOOGLE_AI_API_KEY ||
			process.env.GOOGLE_API_KEY ||
			'',
	).trim();
	if (!apiKey) return null; // không có key -> dùng fallback truy xuất
	state.llm = new ChatGoogleGenerativeAI({
		apiKey,
		model: CHAT_MODEL,
		temperature: 0,
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		// Fail nhanh khi Gemini lỗi/quá tải (429) -> chuyển fallback ngay,
		// tránh SDK tự retry với backoff dài (có thể chờ ~90s).
		maxRetries: Number(process.env.GEMINI_MAX_RETRIES ?? 0),
		timeout: Number(process.env.GEMINI_TIMEOUT_MS ?? 20000),
	});
	return state.llm;
}

// Chuỗi sinh câu trả lời (stuff documents) — tạo 1 lần rồi tái sử dụng.
function getCombineChain() {
	if (state.combineChainPromise) return state.combineChainPromise;
	const llm = getLLM();
	if (!llm) return null;
	const qaPrompt = ChatPromptTemplate.fromMessages([
		['system', SYSTEM_PROMPT],
		new MessagesPlaceholder('chat_history'),
		['user', '{input}'],
	]);
	state.combineChainPromise = createStuffDocumentsChain({ llm, prompt: qaPrompt });
	return state.combineChainPromise;
}

// ===== Indexing: chuẩn bị tài liệu =====
async function buildProductDocuments() {
	const products = await Product.find({ isActive: true })
		.select('name description slug price brand category attributes')
		.populate('brand category', 'name');

	return products.map((p) => {
		const price = effectivePrice(p.price);
		const currency = (p.price && p.price.currency) || 'VND';
		const brandName = p.brand?.name || '';
		const categoryName = p.category?.name || '';
		const type = p.attributes?.type || '';
		const content = [
			`Sản phẩm: ${p.name}`,
			p.description ? `Mô tả: ${p.description}` : '',
			brandName ? `Thương hiệu: ${brandName}` : '',
			categoryName ? `Danh mục: ${categoryName}` : '',
			type ? `Loại nhạc cụ: ${type}` : '',
			price != null ? `Giá: ${price.toLocaleString('vi-VN')} ${currency}` : '',
		]
			.filter(Boolean)
			.join('\n');

		return new Document({
			pageContent: content,
			metadata: {
				kind: 'product',
				id: String(p._id),
				slug: p.slug,
				name: p.name,
				price,
				currency,
				brandName,
				categoryName,
				type,
			},
		});
	});
}

function companyDocText() {
	const c = companyInfo;
	return [
		`Tên công ty: ${c.name}`,
		`Hotline mua hàng: ${c.phones.sales} (miễn phí)`,
		`Khiếu nại/Bảo hành: ${c.phones.complaint}`,
		`Email: ${c.email}`,
		`Địa chỉ: ${c.address}`,
		`Thời gian phục vụ: ${c.hours}`,
		`Website: ${c.website}`,
		`Hỗ trợ thanh toán: ${c.payments.join(', ')}`,
		`Chứng nhận: ${c.certifications.join(', ')}`,
		`Trang giới thiệu: ${c.routes.about}`,
		`Trang liên hệ: ${c.routes.contact}`,
		`Hệ thống showroom/đại lý: ${c.routes.showrooms}`,
		`Mua trả góp: ${c.routes.installment}`,
		`Chính sách giao hàng - đổi trả: ${c.routes.shippingReturns}`,
		`Chính sách bảo hành: ${c.routes.warrantyPolicy}`,
		`Tra cứu/kích hoạt bảo hành: ${c.routes.warrantyLookup}`,
		`Hướng dẫn mua hàng: ${c.routes.howToBuy}`,
		`Thanh toán & bảo mật: ${c.routes.paymentSecurity}`,
	].join('\n');
}

async function buildKnowledgeDocuments() {
	const docs = [
		new Document({
			pageContent: companyDocText(),
			metadata: { kind: 'company', source: 'companyInfo' },
		}),
	];

	try {
		const files = fs.existsSync(KNOWLEDGE_DIR) ? fs.readdirSync(KNOWLEDGE_DIR) : [];
		const splitter = new RecursiveCharacterTextSplitter({
			chunkSize: 1200,
			chunkOverlap: 200,
		});
		for (const file of files) {
			const ext = path.extname(file).toLowerCase();
			if (!['.txt', '.md'].includes(ext)) continue;
			const full = path.join(KNOWLEDGE_DIR, file);
			const raw = fs.readFileSync(full, 'utf8');
			if (!raw.trim()) continue;
			// eslint-disable-next-line no-await-in-loop
			const chunks = await splitter.splitText(raw);
			chunks.forEach((chunk, i) =>
				docs.push(
					new Document({
						pageContent: chunk,
						metadata: { kind: 'doc', source: file, chunk: i },
					}),
				),
			);
		}
	} catch (e) {
		console.warn('[rag] Không nạp được tài liệu knowledge:', e?.message);
	}

	return docs;
}

// ===== Indexing: build vector store FAISS =====
export async function buildProductIndex() {
	if (state.building) return state.building;

	state.building = (async () => {
		const embeddings = getEmbeddings();
		const [productDocs, knowledgeDocs] = await Promise.all([
			buildProductDocuments(),
			buildKnowledgeDocuments(),
		]);
		const docs = [...productDocs, ...knowledgeDocs];
		if (docs.length === 0) {
			docs.push(
				new Document({ pageContent: 'Chưa có dữ liệu.', metadata: { kind: 'empty' } }),
			);
		}
		state.vectorStore = await FaissStore.fromDocuments(docs, embeddings);
		state.ready = true;
		return {
			count: docs.length,
			products: productDocs.length,
			docs: knowledgeDocs.length,
		};
	})();

	try {
		return await state.building;
	} finally {
		state.building = null;
	}
}

export function isIndexReady() {
	return state.ready && !!state.vectorStore;
}

export function invalidateProductIndex() {
	// Đánh dấu index cần build lại ở lần truy vấn kế tiếp
	state.ready = false;
	state.vectorStore = null;
}

// FAISS dùng khoảng cách L2 trên vector đã chuẩn hoá: cosine = 1 - L2^2 / 2
function l2ToCosine(distance) {
	return 1 - (distance * distance) / 2;
}

// Một lần truy xuất duy nhất: trả về cả danh sách sản phẩm (đã lọc ngưỡng + ngân sách)
// và các tài liệu ngữ cảnh để sinh câu trả lời. Không có gì liên quan -> rỗng.
async function retrieveScored({ query, k, budgetMin, budgetMax }) {
	const pairs = await state.vectorStore.similaritySearchWithScore(query, Math.max(k, 12));
	const seen = new Set();
	const items = [];
	const productDocs = [];
	const infoDocs = [];

	for (const [doc, distance] of pairs) {
		const m = doc.metadata || {};
		const cos = l2ToCosine(distance);
		if (m.kind === 'product') {
			if (cos < MIN_PRODUCT_SCORE) continue;
			const price = m.price;
			if (Number.isFinite(budgetMin) && price != null && price < budgetMin) continue;
			if (Number.isFinite(budgetMax) && price != null && price > budgetMax) continue;
			if (seen.has(m.id)) continue;
			seen.add(m.id);
			items.push({
				id: m.id,
				slug: m.slug,
				name: m.name,
				price: price ?? null,
				currency: m.currency || 'VND',
				brandName: m.brandName,
				categoryName: m.categoryName,
				type: m.type,
			});
			productDocs.push(doc);
		} else if (cos >= CONTEXT_MIN_SCORE) {
			infoDocs.push(doc);
		}
	}

	// Giới hạn ngữ cảnh để giảm token -> phản hồi nhanh hơn
	const context = [...productDocs.slice(0, 5), ...infoDocs.slice(0, 3)];
	return { items, context };
}

function getHistory(sessionId) {
	if (!sessionId) return [];
	return histories.get(sessionId) || [];
}

function saveHistory(sessionId, userText, botText) {
	if (!sessionId) return;
	const prev = histories.get(sessionId) || [];
	const next = [...prev, new HumanMessage(userText), new AIMessage(botText)].slice(
		-MAX_HISTORY_TURNS * 2,
	);
	histories.set(sessionId, next);
}

function buildBudgetedInput(message, budgetMin, budgetMax) {
	const parts = [];
	if (Number.isFinite(budgetMin)) parts.push(`từ ${budgetMin.toLocaleString('vi-VN')}đ`);
	if (Number.isFinite(budgetMax)) parts.push(`đến ${budgetMax.toLocaleString('vi-VN')}đ`);
	return parts.length ? `${message}\n(Ngân sách mong muốn: ${parts.join(' ')})` : message;
}

// Ghép câu hỏi gần nhất của người dùng vào truy vấn để câu hỏi nối tiếp
// (vd: "rẻ hơn không?") vẫn truy xuất đúng ngữ cảnh — rẻ, không cần gọi LLM.
function buildRetrievalQuery(input, chatHistory) {
	const lastUser = [...(chatHistory || [])]
		.reverse()
		.find((m) => m?._getType?.() === 'human');
	const prev = lastUser && typeof lastUser.content === 'string' ? lastUser.content : '';
	return prev ? `${prev} ${input}` : input;
}

// ===== Trả lời câu hỏi (Generation) =====
export async function answerQuestion({ message, budgetMin, budgetMax, sessionId, k = 6 }) {
	if (!isIndexReady()) {
		await buildProductIndex();
	}

	const input = buildBudgetedInput(message, budgetMin, budgetMax);
	const chatHistory = getHistory(sessionId);

	// Truy xuất MỘT lần: lấy cả sản phẩm gợi ý (đã lọc ngưỡng + ngân sách) lẫn ngữ cảnh.
	const retrievalQuery = buildRetrievalQuery(input, chatHistory);
	const { items, context } = await retrieveScored({
		query: retrievalQuery,
		k,
		budgetMin,
		budgetMax,
	});

	// Không có gì liên quan (từ vô nghĩa / lạc đề) -> trả lời ngay, KHÔNG gọi Gemini.
	if (context.length === 0) {
		saveHistory(sessionId, message, NO_MATCH_ANSWER);
		return { answer: NO_MATCH_ANSWER, items: [] };
	}

	const chainPromise = getCombineChain();
	if (chainPromise) {
		try {
			const chain = await chainPromise;
			const answer = (
				await chain.invoke({ input, chat_history: chatHistory, context })
			).trim();
			saveHistory(sessionId, message, answer);
			return { answer, items };
		} catch (e) {
			console.warn('[rag] Gemini lỗi, dùng fallback truy xuất:', e?.message);
		}
	}

	// Fallback khi không có Gemini API key hoặc chain lỗi: chỉ truy xuất + template
	const answer = items.length
		? 'Gợi ý một số sản phẩm phù hợp:\n' +
		  items
				.slice(0, 3)
				.map(
					(p, i) =>
						`${i + 1}. ${p.name} — ${
							p.price != null ? p.price.toLocaleString('vi-VN') : 'Liên hệ'
						} ${p.currency} (/products/${p.slug})`,
				)
				.join('\n')
		: NO_MATCH_ANSWER;
	saveHistory(sessionId, message, answer);
	return { answer, items };
}
