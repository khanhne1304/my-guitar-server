import mongoose from 'mongoose';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import FriendRequest from '../models/FriendRequest.js';

const PUBLIC_FIELDS = 'username fullName avatarUrl createdAt';

function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

/** Trả về [userA, userB] với id nhỏ hơn trước (chuẩn hóa cặp) */
function normalizedPair(id1, id2) {
  const s1 = id1.toString();
  const s2 = id2.toString();
  return s1 < s2 ? [oid(id1), oid(id2)] : [oid(id2), oid(id1)];
}

function isBlockedBetween(viewer, target) {
  return (
    viewer.blocked?.some((b) => b.equals(target._id)) ||
    target.blocked?.some((b) => b.equals(viewer._id))
  );
}

export async function listFriends(userId) {
  const me = oid(userId);
  const [meUser, rows] = await Promise.all([
    User.findById(userId).select('blocked'),
    Friendship.find({ $or: [{ userA: me }, { userB: me }] }).lean(),
  ]);
  if (!meUser) return [];
  const blocked = new Set((meUser.blocked || []).map((b) => b.toString()));
  const otherIds = rows.map((r) => (r.userA.toString() === me.toString() ? r.userB : r.userA));
  if (!otherIds.length) return [];
  const since = new Map();
  for (const r of rows) {
    const o = r.userA.toString() === me.toString() ? r.userB.toString() : r.userA.toString();
    since.set(o, r.createdAt);
  }
  const users = await User.find({ _id: { $in: otherIds } }).select(PUBLIC_FIELDS).lean();
  return users
    .filter((u) => !blocked.has(u._id.toString()))
    .map((u) => ({
      ...u,
      createdAt: since.get(u._id.toString()) || u.createdAt,
      mutualCount: 0,
    }));
}

export async function listIncomingFriendRequests(userId) {
  const reqs = await FriendRequest.find({ to: userId })
    .populate('from', PUBLIC_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
  return reqs
    .filter((r) => r.from)
    .map((r) => ({
      ...r.from,
      mutualCount: 0,
    }));
}

export async function sendFriendRequest(fromId, toId) {
  if (fromId === toId)
    throw Object.assign(new Error('Cannot add yourself'), { status: 400 });
  const [from, to] = await Promise.all([
    User.findById(fromId).select('blocked'),
    User.findById(toId).select('blocked'),
  ]);
  if (!from || !to) throw Object.assign(new Error('User not found'), { status: 404 });
  if (isBlockedBetween(from, to))
    throw Object.assign(new Error('Blocked'), { status: 403 });

  const [userA, userB] = normalizedPair(fromId, toId);
  const existingFriend = await Friendship.findOne({ userA, userB });
  if (existingFriend)
    throw Object.assign(new Error('Already friends'), { status: 400 });

  const reverse = await FriendRequest.findOne({ from: toId, to: fromId });
  if (reverse) {
    await FriendRequest.deleteOne({ _id: reverse._id });
    await Friendship.create({ userA, userB });
    return { ok: true, autoAccepted: true };
  }

  const dup = await FriendRequest.findOne({ from: fromId, to: toId });
  if (dup) throw Object.assign(new Error('Request already sent'), { status: 400 });

  await FriendRequest.create({ from: fromId, to: toId });
  return { ok: true, autoAccepted: false };
}

export async function acceptFriendRequest(recipientId, requesterId) {
  const reqDoc = await FriendRequest.findOne({ from: requesterId, to: recipientId });
  if (!reqDoc) throw Object.assign(new Error('No pending request'), { status: 404 });
  const [userA, userB] = normalizedPair(recipientId, requesterId);
  await FriendRequest.deleteOne({ _id: reqDoc._id });
  try {
    await Friendship.create({ userA, userB });
  } catch (e) {
    if (e?.code === 11000) return { ok: true };
    throw e;
  }
  return { ok: true };
}

export async function removeFriendRequest(currentUserId, otherUserId) {
  const r = await FriendRequest.deleteOne({
    $or: [
      { from: currentUserId, to: otherUserId },
      { from: otherUserId, to: currentUserId },
    ],
  });
  if (r.deletedCount === 0)
    throw Object.assign(new Error('No request found'), { status: 404 });
  return { ok: true };
}

export async function unfriend(userId, friendId) {
  const [userA, userB] = normalizedPair(userId, friendId);
  const r = await Friendship.deleteOne({ userA, userB });
  if (r.deletedCount === 0)
    throw Object.assign(new Error('Not friends'), { status: 404 });
  return { ok: true };
}

export async function blockUser(blockerId, targetId) {
  if (blockerId === targetId)
    throw Object.assign(new Error('Invalid target'), { status: 400 });
  await User.updateOne({ _id: blockerId }, { $addToSet: { blocked: oid(targetId) } });
  await FriendRequest.deleteMany({
    $or: [
      { from: blockerId, to: targetId },
      { from: targetId, to: blockerId },
    ],
  });
  const [userA, userB] = normalizedPair(blockerId, targetId);
  await Friendship.deleteOne({ userA, userB });
  return { ok: true };
}

export async function unblockUser(blockerId, targetId) {
  await User.updateOne({ _id: blockerId }, { $pull: { blocked: oid(targetId) } });
  return { ok: true };
}

export async function searchUsers(viewerId, q, limit = 20) {
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const viewer = await User.findById(viewerId).select('blocked');
  if (!viewer) return [];
  const term = (q || '').trim();
  if (term.length < 1) return [];
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const blockedByViewer = (viewer.blocked || []).map((b) => oid(b));
  const users = await User.find({
    _id: { $ne: oid(viewerId), $nin: blockedByViewer },
    $or: [{ username: rx }, { fullName: rx }],
  })
    .select(PUBLIC_FIELDS)
    .limit(lim)
    .lean();
  return users.map((u) => ({ ...u, mutualCount: 0 }));
}

export async function getPublicProfile(userId) {
  const u = await User.findById(userId).select(PUBLIC_FIELDS).lean();
  if (!u) return null;
  return u;
}
