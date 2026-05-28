import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    completedLessons: { type: [String], default: [] },
    completedModules: { type: [String], default: [] },
    passedQuizIds: { type: [String], default: [] },
    practiceLoggedModuleIds: { type: [String], default: [] },
    xp: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('CourseProgress', courseProgressSchema);
