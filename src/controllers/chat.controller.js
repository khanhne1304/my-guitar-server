import { answerQuestion, isIndexReady, buildProductIndex } from '../services/rag.service.js';

function parseBudget(text) {
	if (!text) return {};
	const s = String(text).toLowerCase();
	const normalized = s.replaceAll('.', '').replaceAll(',', '');

	// Helpers
	const hasAny = (arr) => arr.some((kw) => s.includes(kw));
	const extractAmounts = (str) => {
		const out = [];
		const unitRe = /(triệu|trieu|tỷ|ty)/;
		// Pattern with unit
		const re1 = /(\d+)\s*(triệu|trieu|tỷ|ty)/g;
		let m;
		while ((m = re1.exec(str)) !== null) {
			const n = Number(m[1]);
			if (Number.isFinite(n)) {
				const unit = m[2];
				const mul = /tỷ|ty/.test(unit) ? 1_000_000_000 : 1_000_000;
				out.push(n * mul);
			}
		}
		// Raw long VND (>= 5 digits), avoid duplicates if already captured with units
		const re2 = /(\d{5,})/g;
		while ((m = re2.exec(str)) !== null) {
			const n = Number(m[1]);
			if (Number.isFinite(n)) out.push(n);
		}
		return out;
	};

	let budgetMin;
	let budgetMax;

	// Range: "3-5 triệu", "3 đến 5 triệu", "từ 3 đến 5 triệu"
	const dashRange = normalized.match(/(\d+)\s*-\s*(\d+)\s*(triệu|trieu|tỷ|ty)?/);
	if (dashRange) {
		const n1 = Number(dashRange[1]);
		const n2 = Number(dashRange[2]);
		const unit = dashRange[3] || '';
		const mul = /tỷ|ty/.test(unit) ? 1_000_000_000 : 1_000_000;
		if (Number.isFinite(n1) && Number.isFinite(n2)) {
			budgetMin = n1 * (unit ? mul : 1);
			budgetMax = n2 * (unit ? mul : 1);
		}
	}
	if (budgetMin === undefined && budgetMax === undefined) {
		const wordRange = s.match(/(\d+)\s*(triệu|trieu|tỷ|ty)?\s*(đến|toi|tới)\s*(\d+)\s*(triệu|trieu|tỷ|ty)?/);
		if (wordRange) {
			const n1 = Number(wordRange[1]);
			const u1 = wordRange[2] || '';
			const n2 = Number(wordRange[4]);
			const u2 = wordRange[5] || u1;
			const mul1 = /tỷ|ty/.test(u1) ? 1_000_000_000 : u1 ? 1_000_000 : 1;
			const mul2 = /tỷ|ty/.test(u2) ? 1_000_000_000 : u2 ? 1_000_000 : 1;
			if (Number.isFinite(n1) && Number.isFinite(n2)) {
				budgetMin = n1 * mul1;
				budgetMax = n2 * mul2;
			}
		}
	}

	// Independent min/max keywords may co-exist in a single query
	const hasMinKw = hasAny(['trên', 'hon', 'hơn', '>=', '>', 'ít nhất', 'toi thieu', 'tối thiểu', 'tu', 'từ']);
	const hasMaxKw = hasAny(['duoi', 'dưới', '<=', '<', 'toi da', 'tối đa', 'khong qua', 'không quá', 'khong hon', 'không hơn']);
	if ((hasMinKw || hasMaxKw) && (budgetMin === undefined && budgetMax === undefined)) {
		const amounts = extractAmounts(normalized);
		if (hasMinKw && hasMaxKw && amounts.length >= 2) {
			[budgetMin, budgetMax] = [amounts[0], amounts[1]];
		} else if (hasMinKw && amounts.length >= 1) {
			[budgetMin] = [amounts[0]];
		} else if (hasMaxKw && amounts.length >= 1) {
			[budgetMax] = [amounts[0]];
		}
	}

	// Fallback: single number -> treat as approximate max
	if (budgetMin === undefined && budgetMax === undefined) {
		const amounts = extractAmounts(normalized);
		if (amounts.length >= 1) budgetMax = amounts[0];
	}

	const out = {};
	if (Number.isFinite(budgetMin)) out.budgetMin = budgetMin;
	if (Number.isFinite(budgetMax)) out.budgetMax = budgetMax;
	return out;
}

export async function chatRecommend(req, res, next) {
	try {
		const { message, budgetMin, budgetMax } = req.body || {};
		if (!message || typeof message !== 'string') {
			return res.status(400).json({ message: 'Thiếu trường message (string)' });
		}
		if (!isIndexReady()) {
			// warm up index lazily
			buildProductIndex().catch(() => {});
		}
		const autoBudget = parseBudget(message);
		const result = await answerQuestion({
			message,
			budgetMin: Number.isFinite(budgetMin) ? budgetMin : autoBudget.budgetMin,
			budgetMax: Number.isFinite(budgetMax) ? budgetMax : autoBudget.budgetMax,
		});
		res.json(result);
	} catch (e) {
		next(e);
	}
}

export async function reindexProducts(_req, res, next) {
	try {
		const meta = await buildProductIndex();
		res.json({ message: 'Reindexed', ...meta });
	} catch (e) {
		next(e);
	}
}


