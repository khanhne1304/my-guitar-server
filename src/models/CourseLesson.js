import mongoose from 'mongoose';

const courseLessonSchema = new mongoose.Schema(
  {
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    /** YouTube watch URL or embed URL — normalized when serving */
    videoUrl: { type: String, required: true, trim: true },
    /** Nội dung text (markdown/plain) bổ sung cho video */
    content: { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 1 },
    order: { type: Number, required: true },
  },
  { timestamps: true },
);

courseLessonSchema.index({ module: 1, order: 1 });

export default mongoose.model('CourseLesson', courseLessonSchema);
