import mongoose from 'mongoose';
import DirectMessage from '../models/DirectMessage.js';
import User from '../models/User.js';
import { areFriends } from './friend.service.js';

const PUBLIC_FIELDS = 'username fullName avatarUrl';
const DEFAULT_LIMIT = 50;

function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

function currentUserId(user) {
  return user.id?.toString?.() || user._id?.toString?.();
}

export async function listConversations(userId) {
  const me = oid(userId);
  const rows = await DirectMessage.aggregate([
    { $match: { $or: [{ sender: me }, { recipient: me }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$sender', me] }, '$recipient', '$sender'],
        },
        lastMessage: { $first: '$$ROOT' },
        unread: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$recipient', me] },
                  { $eq: [{ $ifNull: ['$readAt', null] }, null] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  if (!rows.length) return [];

  const otherIds = rows.map((r) => r._id);
  const users = await User.find({ _id: { $in: otherIds } }).select(PUBLIC_FIELDS).lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const meStr = me.toString();

  return rows
    .map((r) => {
      const u = userMap.get(r._id.toString());
      if (!u) return null;
      const lm = r.lastMessage;
      return {
        user: {
          id: u._id.toString(),
          name: u.fullName || u.username || 'Người dùng',
          avatarUrl: u.avatarUrl || '',
        },
        lastAt: lm.createdAt,
        lastMessage: {
          text: lm.text,
          fromMe: lm.sender.toString() === meStr,
        },
        unread: r.unread || 0,
      };
    })
    .filter(Boolean);
}

export async function getMessages(userId, otherUserId, { before, limit = DEFAULT_LIMIT } = {}) {
  if (!(await areFriends(userId, otherUserId))) {
    throw Object.assign(new Error('Chỉ có thể nhắn tin với bạn bè'), { status: 403 });
  }

  const me = oid(userId);
  const other = oid(otherUserId);
  const lim = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 100);

  const filter = {
    $or: [
      { sender: me, recipient: other },
      { sender: other, recipient: me },
    ],
  };
  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d };
  }

  const msgs = await DirectMessage.find(filter).sort({ createdAt: -1 }).limit(lim).lean();

  await DirectMessage.updateMany(
    { sender: other, recipient: me, readAt: null },
    { $set: { readAt: new Date() } },
  );

  const meStr = me.toString();
  return msgs.reverse().map((m) => ({
    id: m._id.toString(),
    text: m.text,
    fromMe: m.sender.toString() === meStr,
    at: m.createdAt,
  }));
}

export async function sendMessage(senderId, recipientId, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw Object.assign(new Error('Tin nhắn không được để trống'), { status: 400 });
  if (trimmed.length > 4000) throw Object.assign(new Error('Tin nhắn quá dài'), { status: 400 });
  if (senderId.toString() === recipientId.toString()) {
    throw Object.assign(new Error('Không thể tự nhắn tin'), { status: 400 });
  }

  if (!(await areFriends(senderId, recipientId))) {
    throw Object.assign(new Error('Chỉ có thể nhắn tin với bạn bè'), { status: 403 });
  }

  const recipient = await User.findById(recipientId).select('_id');
  if (!recipient) throw Object.assign(new Error('User not found'), { status: 404 });

  const doc = await DirectMessage.create({
    sender: oid(senderId),
    recipient: oid(recipientId),
    text: trimmed,
  });

  return {
    id: doc._id.toString(),
    text: doc.text,
    fromMe: true,
    at: doc.createdAt,
  };
}

export async function getUnreadCount(userId) {
  const me = oid(userId);
  return DirectMessage.countDocuments({ recipient: me, readAt: null });
}

export async function markThreadRead(userId, otherUserId) {
  if (!(await areFriends(userId, otherUserId))) {
    throw Object.assign(new Error('Chỉ có thể nhắn tin với bạn bè'), { status: 403 });
  }
  const me = oid(userId);
  const other = oid(otherUserId);
  await DirectMessage.updateMany(
    { sender: other, recipient: me, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { ok: true };
}

export { currentUserId };
