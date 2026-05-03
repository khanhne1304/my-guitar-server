import mongoose from 'mongoose';

const quizScoreSchema = new mongoose.Schema(
  {
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule', required: true },
    scorePercent: { type: Number, required: true, min: 0, max: 100 },
    passed: { type: Boolean, required: true },
    submittedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const courseUserProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    completedLessonIds: { type: [String], default: [] },
    quizScores: { type: [quizScoreSchema], default: [] },
  },
  { timestamps: true },
);

courseUserProgressSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.model('CourseUserProgress', courseUserProgressSchema);
