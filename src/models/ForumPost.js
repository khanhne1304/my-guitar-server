import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    haha: { type: Number, default: 0 },
    angry: { type: Number, default: 0 },
  },
  { _id: false },
);

const forumPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      trim: true,
      required: [true, 'Nội dung bài viết là bắt buộc'],
    },
    images: [{ type: String }],
    videoUrl: { type: String },
    reactions: {
      type: reactionSchema,
      default: () => ({}),
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model('ForumPost', forumPostSchema);

