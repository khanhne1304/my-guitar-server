import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    passed: { type: Boolean, required: true },
  },
  { timestamps: true },
);

quizAttemptSchema.index({ userId: 1, quizId: 1, createdAt: -1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);
