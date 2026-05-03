import mongoose from 'mongoose';

const forumVoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['thread', 'answer'], required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: ['upvote', 'downvote'], required: true, index: true },
  },
  { timestamps: true },
);

forumVoteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model('ForumVote', forumVoteSchema);

