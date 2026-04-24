import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
	{
		// key: product slug, value: quantity
	},
	{ strict: false, _id: false },
);

const storeSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		address: { type: String, required: true, trim: true },
		phone: { type: String, trim: true },
		inventory: { type: inventorySchema, default: {} },
		isActive: { type: Boolean, default: true, index: true },
	},
	{ timestamps: true },
);

export default mongoose.model('Store', storeSchema);



