import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    /** Ảnh bìa (URL) */
    thumbnail: { type: String, trim: true },
    /** Mức độ chuẩn hoá (marketplace) */
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    /** Hiển thị tự do (vd. tiếng Việt), tương thích khóa seed cũ */
    levelLabel: { type: String, default: 'Cơ bản', trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    /** Giảng viên tạo khóa; null = khóa hệ thống / seed */
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    /** Giá (VND hoặc đơn vị app); null = miễn phí */
    price: { type: Number, min: 0, default: null },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model('Course', courseSchema);
