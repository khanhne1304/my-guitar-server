import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { Document } from '@langchain/core/documents';

const BEGINNER_MAX_PRICE = Number(process.env.RAG_BEGINNER_MAX_PRICE ?? 3_000_000);

function effectivePrice(price) {
	if (!price) return null;
	const sale = price.sale;
	const base = price.base;
	if (typeof sale === 'number' && sale > 0) return sale;
	if (typeof base === 'number') return base;
	return null;
}

function normalizeText(text) {
	return String(text || '')
		.toLowerCase()
		.replace(/đ/g, 'd')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

function parseLimit(message) {
	const s = String(message || '');
	const patterns = [
		/top\s*(\d+)/i,
		/(\d+)\s*sản phẩm/i,
		/(\d+)\s*san pham/i,
		/(\d+)\s*sp\b/i,
	];
	for (const re of patterns) {
		const m = s.match(re);
		if (m?.[1]) {
			const n = Number(m[1]);
			if (Number.isFinite(n) && n > 0) return Math.min(n, 10);
		}
	}
	return 3;
}

export function detectProductQueryIntent(message) {
	const raw = String(message || '');
	const s = normalizeText(raw);
	const limit = parseLimit(raw);

	if (
		/ban chay|bán chạy|best.?sell|hot nhat|hot nhất|pho bien|phổ biến|ban nhieu|bán nhiều|sell.?most|mua nhieu|mua nhiều/.test(
			s,
		)
	) {
		return { type: 'best_selling', limit };
	}

	if (
		/re nhat|rẻ nhất|gia thap nhat|giá thấp nhất|cheap|it tien|ít tiền|gia re|giá rẻ|thap nhat|thấp nhất|tiet kiem|tiết kiệm/.test(
			s,
		)
	) {
		return { type: 'cheapest', limit };
	}

	if (
		/dat nhat|đắt nhất|gia cao nhat|giá cao nhất|expensive|cao cap|cao cấp|premium|hang sang|hàng sang|dat nhat|đắt nhất/.test(
			s,
		)
	) {
		return { type: 'most_expensive', limit };
	}

	if (
		/nguoi moi|người mới|moi tap|mới tập|moi bat dau|mới bắt đầu|beginner|co ban|cơ bản|tap choi|tập chơi|phu hop nguoi moi|phù hợp người mới|cho nguoi moi|cho người mới|hoc guitar|học guitar|moi hoc|mới học/.test(
			s,
		)
	) {
		return { type: 'beginner', limit };
	}

	if (
		/danh gia cao|đánh giá cao|rating cao|nhieu sao|nhiều sao|review tot|review tốt|duoc yeu thich|được yêu thích|tot nhat|tốt nhất/.test(
			s,
		)
	) {
		return { type: 'highest_rated', limit };
	}

	return null;
}

function mapProduct(p, extra = {}) {
	const price = effectivePrice(p.price);
	return {
		id: String(p._id),
		slug: p.slug,
		name: p.name,
		price,
		currency: p.price?.currency || 'VND',
		brandName: p.brand?.name || '',
		categoryName: p.category?.name || '',
		type: p.attributes?.type || '',
		ratingAverage: p.ratingAverage ?? 0,
		ratingCount: p.ratingCount ?? 0,
		...extra,
	};
}

async function loadProductsByIds(ids) {
	if (!ids.length) return [];
	const products = await Product.find({ _id: { $in: ids }, isActive: true })
		.select('name slug price brand category attributes ratingAverage ratingCount')
		.populate('brand category', 'name')
		.lean();
	const map = new Map(products.map((p) => [String(p._id), p]));
	return ids.map((id) => map.get(String(id))).filter(Boolean);
}

async function fetchBestSelling(limit) {
	const agg = await Order.aggregate([
		{ $match: { status: { $nin: ['cancelled'] } } },
		{ $unwind: '$items' },
		{
			$group: {
				_id: '$items.product',
				totalSold: { $sum: '$items.qty' },
			},
		},
		{ $match: { _id: { $ne: null } } },
		{ $sort: { totalSold: -1 } },
		{ $limit: limit },
	]);

	if (agg.length > 0) {
		const products = await loadProductsByIds(agg.map((a) => a._id));
		const soldMap = new Map(agg.map((a) => [String(a._id), a.totalSold]));
		return products.map((p) => mapProduct(p, { totalSold: soldMap.get(String(p._id)) || 0 }));
	}

	// Chưa có đơn hàng → fallback theo đánh giá
	const fallback = await Product.find({ isActive: true, ratingCount: { $gt: 0 } })
		.select('name slug price brand category attributes ratingAverage ratingCount')
		.populate('brand category', 'name')
		.sort({ ratingCount: -1, ratingAverage: -1 })
		.limit(limit)
		.lean();

	return fallback.map((p) => mapProduct(p, { totalSold: 0, note: 'Chưa có dữ liệu bán hàng, gợi ý theo đánh giá' }));
}

async function fetchByPrice(sortDir, limit, budgetMin, budgetMax) {
	const products = await Product.find({ isActive: true })
		.select('name slug price brand category attributes ratingAverage ratingCount')
		.populate('brand category', 'name')
		.lean();

	let items = products
		.map((p) => mapProduct(p))
		.filter((p) => p.price != null);

	if (Number.isFinite(budgetMin)) items = items.filter((p) => p.price >= budgetMin);
	if (Number.isFinite(budgetMax)) items = items.filter((p) => p.price <= budgetMax);

	items.sort((a, b) => (sortDir === 'asc' ? a.price - b.price : b.price - a.price));
	return items.slice(0, limit);
}

function isBeginnerFriendly(product) {
	const text = normalizeText(
		[product.name, product.description, product.attributes?.type, product.attributes?.level]
			.filter(Boolean)
			.join(' '),
	);
	return /nguoi moi|moi tap|co ban|beginner|entry|starter|hoc|tap/.test(text);
}

async function fetchForBeginners(limit, budgetMin, budgetMax) {
	const maxPrice = Number.isFinite(budgetMax)
		? Math.min(budgetMax, BEGINNER_MAX_PRICE)
		: BEGINNER_MAX_PRICE;
	const minPrice = Number.isFinite(budgetMin) ? budgetMin : 0;

	const products = await Product.find({ isActive: true })
		.select('name slug price brand category attributes description ratingAverage ratingCount')
		.populate('brand category', 'name')
		.lean();

	let items = products
		.map((p) => mapProduct(p))
		.filter((p) => p.price != null && p.price >= minPrice && p.price <= maxPrice);

	const friendly = items.filter((p) => {
		const full = products.find((x) => String(x._id) === p.id);
		return full ? isBeginnerFriendly(full) : false;
	});

	if (friendly.length >= 1) {
		friendly.sort((a, b) => b.ratingAverage - a.ratingAverage || a.price - b.price);
		return friendly.slice(0, limit);
	}

	items.sort((a, b) => a.price - b.price || b.ratingAverage - a.ratingAverage);
	return items.slice(0, limit);
}

async function fetchHighestRated(limit) {
	const products = await Product.find({ isActive: true })
		.select('name slug price brand category attributes ratingAverage ratingCount')
		.populate('brand category', 'name')
		.sort({ ratingAverage: -1, ratingCount: -1 })
		.limit(limit)
		.lean();

	return products.map((p) => mapProduct(p));
}

const QUERY_LABELS = {
	best_selling: 'sản phẩm bán chạy nhất',
	cheapest: 'sản phẩm giá rẻ nhất',
	most_expensive: 'sản phẩm giá cao nhất',
	beginner: 'sản phẩm phù hợp người mới',
	highest_rated: 'sản phẩm được đánh giá cao nhất',
};

function productToDocument(p, queryType) {
	const lines = [
		`Sản phẩm: ${p.name}`,
		p.brandName ? `Thương hiệu: ${p.brandName}` : '',
		p.categoryName ? `Danh mục: ${p.categoryName}` : '',
		p.type ? `Loại: ${p.type}` : '',
		p.price != null ? `Giá: ${p.price.toLocaleString('vi-VN')} ${p.currency}` : '',
		p.ratingAverage ? `Đánh giá: ${p.ratingAverage}/5 (${p.ratingCount} lượt)` : '',
		p.totalSold != null && p.totalSold > 0 ? `Đã bán: ${p.totalSold} sản phẩm` : '',
		p.note || '',
		`Loại truy vấn: ${QUERY_LABELS[queryType] || queryType}`,
	].filter(Boolean);

	return new Document({
		pageContent: lines.join('\n'),
		metadata: {
			kind: 'product',
			id: p.id,
			slug: p.slug,
			name: p.name,
			price: p.price,
			currency: p.currency,
			brandName: p.brandName,
			categoryName: p.categoryName,
			type: p.type,
			queryType,
		},
	});
}

export function formatStructuredAnswer(queryType, products) {
	const label = QUERY_LABELS[queryType] || 'sản phẩm phù hợp';
	if (!products.length) {
		return `Hiện chưa có ${label} trong hệ thống.`;
	}

	const lines = products.map((p, i) => {
		const priceStr =
			p.price != null ? `${p.price.toLocaleString('vi-VN')} ${p.currency}` : 'Liên hệ';
		const extras = [];
		if (p.totalSold > 0) extras.push(`đã bán ${p.totalSold}`);
		if (p.ratingAverage > 0) extras.push(`${p.ratingAverage}★ (${p.ratingCount} đánh giá)`);
		if (p.note) extras.push(p.note);
		const extraStr = extras.length ? ` — ${extras.join(', ')}` : '';
		return `${i + 1}. ${p.name} — ${priceStr}${extraStr}`;
	});

	return `Dưới đây là ${label}:\n${lines.join('\n')}`;
}

export async function runStructuredProductQuery({ message, budgetMin, budgetMax }) {
	const intent = detectProductQueryIntent(message);
	if (!intent) return null;

	let products = [];
	switch (intent.type) {
		case 'best_selling':
			products = await fetchBestSelling(intent.limit);
			break;
		case 'cheapest':
			products = await fetchByPrice('asc', intent.limit, budgetMin, budgetMax);
			break;
		case 'most_expensive':
			products = await fetchByPrice('desc', intent.limit, budgetMin, budgetMax);
			break;
		case 'beginner':
			products = await fetchForBeginners(intent.limit, budgetMin, budgetMax);
			break;
		case 'highest_rated':
			products = await fetchHighestRated(intent.limit);
			break;
		default:
			return null;
	}

	return {
		queryType: intent.type,
		limit: intent.limit,
		items: products,
		context: products.map((p) => productToDocument(p, intent.type)),
	};
}
