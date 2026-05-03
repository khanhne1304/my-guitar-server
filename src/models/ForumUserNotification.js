import mongoose from 'mongoose';

/**
 * Per-user inbox for forum activity (distinct from broadcast admin "Notification" docs).
 */
const forumUserNotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Matches Socket event semantics: new_reply | new_like | reply_to_reply */
    eventType: {
      type: String,
      enum: ['new_reply', 'new_like', 'reply_to_reply'],
      required: true,
      index: true,
    },
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumThread', required: true, index: true },
    answer: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumAnswer' },
    reply: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumReply' },
    title: { type: String, required: true, trim: true },
    preview: { type: String, default: '', trim: true },
    readAt: { type: Date, default: null, index: true },
    /** User dismissed from UI ("Ẩn") */
    hiddenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

forumUserNotificationSchema.index({ recipient: 1, createdAt: -1 });
forumUserNotificationSchema.index({ recipient: 1, readAt: 1 });

export default mongoose.model('ForumUserNotification', forumUserNotificationSchema);
