import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true },
  },
  { timestamps: true },
);

// Mỗi user chỉ được review 1 lần / product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// static để cập nhật điểm trung bình cho Product
reviewSchema.statics.recalcProductRating = async function (productId) {
  const agg = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product',
        ratingAvg: { $avg: '$rating' },
        ratingCnt: { $sum: 1 },
      },
    },
  ]);
  const { default: Product } = await import('./Product.js');
  if (agg.length) {
    await Product.findByIdAndUpdate(productId, {
      ratingAverage: Math.round(agg[0].ratingAvg * 10) / 10,
      ratingCount: agg[0].ratingCnt,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingAverage: 0,
      ratingCount: 0,
    });
  }
};

// hook sau save/remove để cập nhật product
reviewSchema.post('save', function () {
  this.constructor.recalcProductRating(this.product);
});
reviewSchema.post('remove', function () {
  this.constructor.recalcProductRating(this.product);
});

export default mongoose.model('Review', reviewSchema);
