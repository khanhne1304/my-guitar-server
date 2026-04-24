import Store from '../models/Store.js';

export async function listStores(req, res, next) {
	try {
		const stores = await Store.find({ isActive: true }).lean();
		res.json(stores);
	} catch (e) {
		next(e);
	}
}



