import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    order: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);

moduleSchema.index({ courseId: 1, order: 1 });

export default mongoose.model('Module', moduleSchema);
