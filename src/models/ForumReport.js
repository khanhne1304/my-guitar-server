import mongoose from 'mongoose';

const forumReportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumPost',
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Lý do báo cáo là bắt buộc'],
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'ignored', 'removed'],
      default: 'pending',
      index: true,
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    handledAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model('ForumReport', forumReportSchema);

