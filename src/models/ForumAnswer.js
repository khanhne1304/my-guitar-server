import mongoose from 'mongoose';

const forumAnswerSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
    content: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isBestAnswer: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export default mongoose.model('ForumAnswer', forumAnswerSchema);

