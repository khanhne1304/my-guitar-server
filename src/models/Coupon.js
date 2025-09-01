import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: { type: String, enum: ['percent', 'fixed'], required: true }, // giảm %
    amount: { type: Number, required: true }, // ví dụ 10 (%)/ 50000 (đ)
    maxDiscount: { type: Number, default: 0 }, // trần giảm (đ) cho percent (0 = không trần)
    minOrder: { type: Number, default: 0 }, // đơn tối thiểu (đ)
    startAt: { type: Date, default: () => new Date() },
    endAt: { type: Date }, // hết hạn
    usageLimit: { type: Number, default: 0 }, // 0 = không giới hạn
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Coupon', couponSchema);
