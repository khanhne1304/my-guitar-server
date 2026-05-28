import mongoose from 'mongoose';

const forumReplySchema = new mongoose.Schema(
  {
    answer: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumAnswer', required: true, index: true },
    content: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.model('ForumReply', forumReplySchema);

