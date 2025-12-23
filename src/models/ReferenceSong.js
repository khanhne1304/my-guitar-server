import mongoose from 'mongoose';

const referenceSongSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true,
      index: 'text'
    },
    description: { 
      type: String,
      trim: true
    },
    artist: { 
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
    // Thông tin bổ sung
    tempo: { type: Number }, // BPM
    timeSignature: { type: String, default: "4/4" },
    key: { type: String }, // C, D, E, etc.
    difficulty: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    },
    tags: { 
      type: [String], 
      default: [] 
    },
    // Người tạo (admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Trạng thái
    isActive: { 
      type: Boolean, 
      default: true 
    },
    // Số lần được sử dụng để so sánh
    usageCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Indexes
referenceSongSchema.index({ title: 'text', description: 'text', artist: 'text' });
referenceSongSchema.index({ createdBy: 1 });
referenceSongSchema.index({ isActive: 1 });
referenceSongSchema.index({ difficulty: 1 });

export default mongoose.model('ReferenceSong', referenceSongSchema);



