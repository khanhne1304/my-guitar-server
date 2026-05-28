import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    youtubeVideoId: { type: String, required: true, trim: true },
    duration: { type: Number, default: 5, min: 1 },
    order: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);

lessonSchema.index({ moduleId: 1, order: 1 });

export default mongoose.model('Lesson', lessonSchema);
