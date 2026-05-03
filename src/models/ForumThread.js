import mongoose from 'mongoose';

const THREAD_CATEGORIES = ['lesson', 'tab', 'chord', 'discussion'];
const FILE_TYPES = ['pdf', 'image', 'audio'];

const forumThreadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['question', 'tutorial', 'discussion', 'tab'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: THREAD_CATEGORIES,
      required: true,
      index: true,
    },
    tags: [{ type: String, trim: true, index: true }],
    files: [
      {
        url: { type: String, required: true, trim: true },
        type: { type: String, enum: FILE_TYPES, required: true },
      },
    ],
    videoUrl: { type: String, trim: true, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bestAnswer: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumAnswer', default: null },
    // Backward-compat for older clients; prefer `files` + `videoUrl`.
    mediaUrl: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

export default mongoose.model('ForumThread', forumThreadSchema);

