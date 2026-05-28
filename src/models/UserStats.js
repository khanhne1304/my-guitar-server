import mongoose from 'mongoose';

const userStatsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    streakDays: { type: Number, default: 0, min: 0 },
    lastActiveDate: { type: Date, default: null },
    totalPracticeMinutes: { type: Number, default: 0, min: 0 },
    xp: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export default mongoose.model('UserStats', userStatsSchema);
