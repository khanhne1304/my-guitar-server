import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Mỗi user chỉ được favorite 1 lần / product
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
