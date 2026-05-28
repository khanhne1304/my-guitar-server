import ForumUserNotification from '../models/ForumUserNotification.js';
import { getIO } from '../lib/ioRegistry.js';

/**
 * Persist a forum notification and push the matching Socket.IO event to the recipient's room.
 */
export async function notifyForumEvent({
  recipientId,
  actorId,
  eventType,
  threadId,
  title,
  preview,
  answerId,
  replyId,
}) {
  if (!recipientId || !actorId || String(recipientId) === String(actorId)) {
    return null;
  }

  const doc = await ForumUserNotification.create({
    recipient: recipientId,
    actor: actorId,
    eventType,
    thread: threadId,
    answer: answerId || undefined,
    reply: replyId || undefined,
    title: String(title || '').trim() || 'Diễn đàn',
    preview: String(preview || '').trim(),
  });

  const io = getIO();
  if (io) {
    io.to(`user:${recipientId}`).emit(eventType, {
      notificationId: doc._id,
      threadId: String(threadId),
      answerId: answerId ? String(answerId) : undefined,
      replyId: replyId ? String(replyId) : undefined,
      title: doc.title,
      preview: doc.preview,
      createdAt: doc.createdAt,
      actorId: String(actorId),
    });
  }

  return doc;
}
