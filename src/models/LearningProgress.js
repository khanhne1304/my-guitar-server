import mongoose from 'mongoose';

const learningProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    completedLessonIds: { type: [String], default: [] },
    /** Tổng phút luyện tập (POST /practice-time) */
    totalPracticeMinutes: { type: Number, default: 0, min: 0 },
    /** Tổng phút ghi nhận từ xem video (POST /video-watch-time) */
    totalVideoMinutes: { type: Number, default: 0, min: 0 },
    /**
     * Phút theo ngày YYYY-MM-DD (theo cùng quy ước toISOString().slice(0,10) như client)
     * dùng cho biểu đồ tuần + streak
     */
    practiceMinutesByDay: { type: mongoose.Schema.Types.Mixed, default: {} },
    videoMinutesByDay: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model('LearningProgress', learningProgressSchema);
