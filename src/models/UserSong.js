import mongoose from 'mongoose';

const userSongSchema = new mongoose.Schema(
  {
    // Tên bài hát (user có thể đặt tên)
    title: { 
      type: String, 
      required: true, 
      trim: true,
      index: 'text'
    },
    // Mô tả (optional)
    description: { 
      type: String,
      trim: true
    },
    // File audio đã upload lên Cloudinary
    audioFile: {
      publicId: { type: String, required: true },
      url: { type: String, required: true },
      format: { type: String }, // mp3, wav, etc.
      duration: { type: Number }, // seconds
      size: { type: Number }, // bytes
    },
    // Metadata từ file gốc
    originalFilename: { type: String },
    mimetype: { type: String },
    // Người tạo (user)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Thông tin về bài hát gốc được so sánh (nếu có)
    referenceSongId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReferenceSong',
      default: null
    },
    // Kết quả so sánh cuối cùng (lưu để xem lại)
    lastComparisonResult: {
      type: mongoose.Schema.Types.Mixed, // Lưu kết quả so sánh
      default: null
    },
    // Số lần được sử dụng để so sánh
    comparisonCount: {
      type: Number,
      default: 0
    },
    // Trạng thái
    isActive: { 
      type: Boolean, 
      default: true 
    },
    // Tags để phân loại
    tags: { 
      type: [String], 
      default: [] 
    },
  },
  { timestamps: true }
);

// Indexes
userSongSchema.index({ title: 'text', description: 'text' });
userSongSchema.index({ createdBy: 1, createdAt: -1 }); // Để lấy bài hát của user theo thời gian
userSongSchema.index({ referenceSongId: 1 });
userSongSchema.index({ isActive: 1 });

export default mongoose.model('UserSong', userSongSchema);

