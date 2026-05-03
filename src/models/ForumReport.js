import mongoose from 'mongoose';

const forumReportSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

forumReportSchema.index({ thread: 1, reportedBy: 1, createdAt: -1 });

export default mongoose.model('ForumReport', forumReportSchema);

