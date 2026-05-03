import mongoose from 'mongoose';

const forumAnswerLikeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answer: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumAnswer', required: true, index: true },
  },
  { timestamps: true },
);

forumAnswerLikeSchema.index({ user: 1, answer: 1 }, { unique: true });

export default mongoose.model('ForumAnswerLike', forumAnswerLikeSchema);

