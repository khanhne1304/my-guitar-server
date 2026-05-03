import mongoose from 'mongoose';

const forumLikeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
  },
  { timestamps: true },
);

forumLikeSchema.index({ user: 1, thread: 1 }, { unique: true });

export default mongoose.model('ForumLike', forumLikeSchema);

