// RAG service theo kiến trúc LangChain (Retrieval-Augmented Generation)
// 1. Indexing: tài liệu -> chunk -> embedding (HuggingFace) -> FAISS vector store
// 2. Retrieval: similarity search theo câu hỏi (cosine)
// 3. Generation: DeepSeek LLM + ngữ cảnh truy xuất + bộ nhớ hội thoại
// Nguồn tri thức: sản phẩm, khóa học (MongoDB) + tài liệu (.txt/.md) + thông tin công ty
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Product from '../models/Product.js';
import Course from '../models/Course.js';
import { companyInfo, isCompanyQuery, answerCompanyQuestion } from '../data/companyInfo.js';

import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import {
	runStructuredProductQuery,
	formatStructuredAnswer,
	shouldSuggestProducts,
} from './chatProductQuery.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, '../data/knowledge');

const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
const RAG_LLM_PROVIDER = String(process.env.RAG_LLM_PROVIDER || 'deepseek').toLowerCase();
const DEEPSEEK_CHAT_MODEL =
	process.env.RAG_CHAT_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const GEMINI_CHAT_MODEL =
	process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_HISTORY_TURNS = 8;
const MIN_PRODUCT_SCORE = Number(process.env.RAG_MIN_SCORE ?? 0.35);
const CONTEXT_MIN_SCORE = Number(process.env.RAG_CONTEXT_MIN_SCORE ?? 0.25);
const MAX_OUTPUT_TOKENS = Number(process.env.RAG_MAX_OUTPUT_TOKENS ?? 600);
const NO_MATCH_ANSWER = 'Xin lỗi, mình chưa có thông tin phù hợp với yêu cầu của bạn.';

const LEVEL_LABELS = {
	beginner: 'Cơ bản',
	intermediate: 'Trung cấp',
	advanced: 'Nâng cao',
};

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của cửa hàng nhạc cụ GuitarMaster.
Trả lời bằng tiếng Việt, thân thiện, ngắn gọn và CHỈ dựa vào thông tin trong phần CONTEXT bên dưới.
- Nếu câu hỏi về sản phẩm: ưu tiên đúng loại nhạc cụ và đúng khoảng ngân sách (nếu có); đề xuất tối đa 3 sản phẩm phù hợp nhất, nêu rõ tên và giá.
- Nếu câu hỏi về sản phẩm bán chạy, rẻ nhất, đắt nhất, phù hợp người mới, đánh giá cao: trả lời đúng thứ tự và số lượng trong CONTEXT (không bịa thêm sản phẩm).
- Nếu câu hỏi về khóa học guitar: giới thiệu khóa học phù hợp trình độ, nêu tên và cấp độ.
- Nếu câu hỏi về cửa hàng (địa chỉ, hotline, chính sách...): trả lời dựa trên thông tin công ty trong CONTEXT.
- Nếu không tìm thấy thông tin phù hợp trong CONTEXT, hãy nói: "Xin lỗi, mình chưa có thông tin phù hợp với yêu cầu của bạn."
Tuyệt đối không bịa thông tin nằm ngoài CONTEXT.

CONTEXT:
{context}`;

const state = {
	embeddings: null,
	vectorStore: null,
	llm: null,
	combineChainPromise: null,
	ready: false,
	building: null,
};

const histories = new Map();

/**
 * Chuyển giá trị sang số an toàn (hỗ trợ chuỗi có ký tự không phải số).
 * @param {number|string} value - Giá trị cần chuyển
 * @returns {number|null} Số hợp lệ hoặc null
 */
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

/**
 * Lấy giá hiệu lực của sản phẩm (ưu tiên sale, fallback base).
 * @param {Object} price - Đối tượng giá { base, sale }
 * @returns {number|null} Giá hiệu lực hoặc null
 */
function effectivePrice(price) {
	if (!price) return null;
	const baseNum = toNumberSafe(price.base);
	const saleNum = toNumberSafe(price.sale);
	return saleNum ?? baseNum;
}

/**
 * Khởi tạo hoặc trả về instance HuggingFace embeddings (singleton).
 * @returns {HuggingFaceTransformersEmbeddings} Model embedding cho vector store
 */
function getEmbeddings() {
	if (state.embeddings) return state.embeddings;
	state.embeddings = new HuggingFaceTransformersEmbeddings({ model: EMBEDDING_MODEL });
	return state.embeddings;
}

/**
 * Tạo LLM ChatOpenAI kết nối DeepSeek API.
 * @returns {ChatOpenAI|null} Instance LLM hoặc null nếu thiếu API key
 */
function createDeepSeekLLM() {
	const apiKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
	if (!apiKey) return null;

	const baseURL = String(process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1')
		.trim()
		.replace(/\/$/, '');

	return new ChatOpenAI({
		apiKey,
		model: DEEPSEEK_CHAT_MODEL,
		temperature: 0,
		maxTokens: MAX_OUTPUT_TOKENS,
		maxRetries: Number(process.env.DEEPSEEK_MAX_RETRIES ?? 1),
		timeout: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 30000),
		configuration: { baseURL },
	});
}

/**
 * Tạo LLM ChatGoogleGenerativeAI kết nối Gemini API.
 * @returns {ChatGoogleGenerativeAI|null} Instance LLM hoặc null nếu thiếu API key
 */
function createGeminiLLM() {
	const apiKey = String(
		process.env.GEMINI_API_KEY ||
			process.env.GOOGLE_AI_API_KEY ||
			process.env.GOOGLE_API_KEY ||
			'',
	).trim();
	if (!apiKey) return null;

	return new ChatGoogleGenerativeAI({
		apiKey,
		model: GEMINI_CHAT_MODEL,
		temperature: 0,
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		maxRetries: Number(process.env.GEMINI_MAX_RETRIES ?? 0),
		timeout: Number(process.env.GEMINI_TIMEOUT_MS ?? 20000),
	});
}

/**
 * Lấy LLM đang dùng theo RAG_LLM_PROVIDER (DeepSeek hoặc Gemini, có fallback).
 * @returns {ChatOpenAI|ChatGoogleGenerativeAI|null} Instance LLM hoặc null
 */
function getLLM() {
	if (state.llm) return state.llm;

	if (RAG_LLM_PROVIDER === 'gemini') {
		state.llm = createGeminiLLM() || createDeepSeekLLM();
	} else {
		state.llm = createDeepSeekLLM() || createGeminiLLM();
	}

	return state.llm;
}

/**
 * Tạo hoặc trả về promise chain kết hợp tài liệu + LLM (singleton).
 * @returns {Promise|null} Promise của combine documents chain hoặc null nếu không có LLM
 */
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

/**
 * Xây dựng LangChain Documents từ sản phẩm active trong MongoDB.
 * @returns {Promise<Array<Document>>} Mảng document sản phẩm cho vector index
 */
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

/**
 * Xây dựng LangChain Documents từ khóa học đã publish.
 * @returns {Promise<Array<Document>>} Mảng document khóa học cho vector index
 */
async function buildCourseDocuments() {
	const courses = await Course.find({ isPublished: true })
		.select('title description slug level tags')
		.lean();

	return courses.map((c) => {
		const levelLabel = LEVEL_LABELS[c.level] || c.level || 'Cơ bản';
		const content = [
			`Khóa học: ${c.title}`,
			c.description ? `Mô tả: ${c.description}` : '',
			`Cấp độ: ${levelLabel}`,
			c.tags?.length ? `Chủ đề: ${c.tags.join(', ')}` : '',
			c.slug ? `Đường dẫn: /courses/${c.slug}` : '',
		]
			.filter(Boolean)
			.join('\n');

		return new Document({
			pageContent: content,
			metadata: {
				kind: 'course',
				slug: c.slug,
				title: c.title,
				level: c.level,
			},
		});
	});
}

/**
 * Tạo nội dung văn bản thông tin công ty từ companyInfo.
 * @returns {string} Văn bản mô tả công ty, liên hệ, chính sách
 */
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

/**
 * Nạp tài liệu tri thức: thông tin công ty + file .txt/.md trong knowledge dir.
 * @returns {Promise<Array<Document>>} Mảng document tri thức đã chunk
 */
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

/**
 * Xây dựng hoặc rebuild FAISS vector index từ sản phẩm, khóa học và tài liệu.
 * @returns {Promise<Object>} Thống kê số lượng document đã index
 */
export async function buildProductIndex() {
	if (state.building) return state.building;

	state.building = (async () => {
		const embeddings = getEmbeddings();
		const [productDocs, courseDocs, knowledgeDocs] = await Promise.all([
			buildProductDocuments(),
			buildCourseDocuments(),
			buildKnowledgeDocuments(),
		]);
		const docs = [...productDocs, ...courseDocs, ...knowledgeDocs];
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
			courses: courseDocs.length,
			docs: knowledgeDocs.length,
		};
	})();

	try {
		return await state.building;
	} finally {
		state.building = null;
	}
}

/**
 * Kiểm tra vector index đã sẵn sàng cho truy xuất hay chưa.
 * @returns {boolean} true nếu index đã build xong
 */
export function isIndexReady() {
	return state.ready && !!state.vectorStore;
}

/**
 * Vô hiệu hóa index hiện tại (cần rebuild sau khi dữ liệu thay đổi).
 * @returns {void}
 */
export function invalidateProductIndex() {
	state.ready = false;
	state.vectorStore = null;
}

/**
 * Chuyển khoảng cách L2 sang độ tương đồng cosine (0–1).
 * @param {number} distance - Khoảng cách L2 từ FAISS
 * @returns {number} Độ tương đồng cosine
 */
function l2ToCosine(distance) {
	return 1 - (distance * distance) / 2;
}

/**
 * Truy xuất sản phẩm và tài liệu liên quan từ vector store có chấm điểm.
 * @param {Object} params - Tham số truy xuất
 * @param {string} params.query - Câu truy vấn
 * @param {number} params.k - Số kết quả similarity search
 * @param {number} [params.budgetMin] - Lọc giá tối thiểu
 * @param {number} [params.budgetMax] - Lọc giá tối đa
 * @returns {Promise<Object>} { items, context } — sản phẩm và documents cho LLM
 */
async function retrieveScored({ query, k, budgetMin, budgetMax, includeProducts = true }) {
	const pairs = await state.vectorStore.similaritySearchWithScore(query, Math.max(k, 12));
	const seen = new Set();
	const items = [];
	const productDocs = [];
	const infoDocs = [];

	for (const [doc, distance] of pairs) {
		const m = doc.metadata || {};
		const cos = l2ToCosine(distance);
		if (m.kind === 'product') {
			if (!includeProducts) continue;
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

	const context = [...productDocs.slice(0, 5), ...infoDocs.slice(0, 4)];
	return { items, context };
}

/**
 * Lấy lịch sử hội thoại của phiên chat theo sessionId.
 * @param {string} sessionId - ID phiên chat
 * @returns {Array} Mảng HumanMessage/AIMessage
 */
function getHistory(sessionId) {
	if (!sessionId) return [];
	return histories.get(sessionId) || [];
}

/**
 * Lưu tin nhắn mới vào lịch sử hội thoại (giới hạn MAX_HISTORY_TURNS).
 * @param {string} sessionId - ID phiên chat
 * @param {string} userText - Tin nhắn người dùng
 * @param {string} botText - Câu trả lời bot
 * @returns {void}
 */
function saveHistory(sessionId, userText, botText) {
	if (!sessionId) return;
	const prev = histories.get(sessionId) || [];
	const next = [...prev, new HumanMessage(userText), new AIMessage(botText)].slice(
		-MAX_HISTORY_TURNS * 2,
	);
	histories.set(sessionId, next);
}

/**
 * Xóa lịch sử hội thoại của một phiên chat.
 * @param {string} sessionId - ID phiên chat cần xóa
 * @returns {void}
 */
export function clearHistory(sessionId) {
	if (sessionId) histories.delete(sessionId);
}

/**
 * Bổ sung thông tin ngân sách vào câu hỏi nếu có budgetMin/budgetMax.
 * @param {string} message - Câu hỏi gốc
 * @param {number} budgetMin - Ngân sách tối thiểu
 * @param {number} budgetMax - Ngân sách tối đa
 * @returns {string} Câu hỏi đã bổ sung ngữ cảnh ngân sách
 */
function buildBudgetedInput(message, budgetMin, budgetMax) {
	const parts = [];
	if (Number.isFinite(budgetMin)) parts.push(`từ ${budgetMin.toLocaleString('vi-VN')}đ`);
	if (Number.isFinite(budgetMax)) parts.push(`đến ${budgetMax.toLocaleString('vi-VN')}đ`);
	return parts.length ? `${message}\n(Ngân sách mong muốn: ${parts.join(' ')})` : message;
}

/**
 * Ghép câu hỏi hiện tại với tin nhắn user trước đó để cải thiện retrieval.
 * @param {string} input - Câu hỏi hiện tại
 * @param {Array} chatHistory - Lịch sử hội thoại
 * @returns {string} Câu truy vấn retrieval đã mở rộng ngữ cảnh
 */
function buildRetrievalQuery(input, chatHistory) {
	const lastUser = [...(chatHistory || [])]
		.reverse()
		.find((m) => m?._getType?.() === 'human');
	const prev = lastUser && typeof lastUser.content === 'string' ? lastUser.content : '';
	return prev ? `${prev} ${input}` : input;
}

/**
 * Trả lời câu hỏi người dùng qua RAG: truy vấn có cấu trúc hoặc similarity search + LLM.
 * @param {Object} params - Tham số hỏi đáp
 * @param {string} params.message - Câu hỏi người dùng
 * @param {number} [params.budgetMin] - Ngân sách tối thiểu
 * @param {number} [params.budgetMax] - Ngân sách tối đa
 * @param {string} [params.sessionId] - ID phiên chat (lưu lịch sử)
 * @param {number} [params.k=6] - Số kết quả similarity search
 * @returns {Promise<Object>} { answer, items } — câu trả lời và sản phẩm gợi ý
 */
export async function answerQuestion({ message, budgetMin, budgetMax, sessionId, k = 6 }) {
	const suggestProducts = shouldSuggestProducts(message);

	// Câu hỏi về công ty/chính sách — trả lời trực tiếp, không gợi ý sản phẩm
	if (isCompanyQuery(message)) {
		const answer = answerCompanyQuestion(message);
		saveHistory(sessionId, message, answer);
		return { answer, items: [] };
	}

	const input = buildBudgetedInput(message, budgetMin, budgetMax);
	const chatHistory = getHistory(sessionId);

	// Truy vấn có cấu trúc: bán chạy, rẻ/đắt nhất, người mới, đánh giá cao...
	const structured = suggestProducts
		? await runStructuredProductQuery({ message, budgetMin, budgetMax })
		: null;
	if (structured) {
		const { items, context, queryType } = structured;
		if (items.length === 0) {
			const answer = formatStructuredAnswer(queryType, []);
			saveHistory(sessionId, message, answer);
			return { answer, items: [] };
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
				console.warn('[rag] LLM lỗi (structured), dùng template:', e?.message);
			}
		}

		const answer = formatStructuredAnswer(queryType, items);
		saveHistory(sessionId, message, answer);
		return { answer, items };
	}

	if (!isIndexReady()) {
		await buildProductIndex();
	}

	const retrievalQuery = buildRetrievalQuery(input, chatHistory);
	const { items, context } = await retrieveScored({
		query: retrievalQuery,
		k,
		budgetMin,
		budgetMax,
		includeProducts: suggestProducts,
	});

	if (context.length === 0) {
		saveHistory(sessionId, message, NO_MATCH_ANSWER);
		return { answer: NO_MATCH_ANSWER, items: [] };
	}

	const responseItems = suggestProducts ? items : [];

	const chainPromise = getCombineChain();
	if (chainPromise) {
		try {
			const chain = await chainPromise;
			const answer = (
				await chain.invoke({ input, chat_history: chatHistory, context })
			).trim();
			saveHistory(sessionId, message, answer);
			return { answer, items: responseItems };
		} catch (e) {
			console.warn('[rag] LLM lỗi, dùng fallback truy xuất:', e?.message);
		}
	}

	const answer = responseItems.length
		? 'Gợi ý một số sản phẩm phù hợp:\n' +
		  responseItems
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
	return { answer, items: responseItems };
}
