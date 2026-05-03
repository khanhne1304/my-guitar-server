import mongoose from 'mongoose';

const courseModuleSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, required: true },
  },
  { timestamps: true },
);

courseModuleSchema.index({ course: 1, order: 1 });

export default mongoose.model('CourseModule', courseModuleSchema);
