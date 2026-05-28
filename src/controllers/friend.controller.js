import mongoose from 'mongoose';
import {
  listFriends,
  listIncomingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendRequest,
  unfriend,
  blockUser,
  unblockUser,
  searchUsers,
  getPublicProfile,
} from '../services/friend.service.js';

function handleFriendError(e, res, next) {
  if (e.status) {
    return res.status(e.status).json({ message: e.message });
  }
  return next(e);
}

export async function getFriends(req, res, next) {
  try {
    const list = await listFriends(req.user.id);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function getFriendRequests(req, res, next) {
  try {
    const list = await listIncomingFriendRequests(req.user.id);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function postFriendRequest(req, res, next) {
  try {
    const toId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(toId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const out = await sendFriendRequest(req.user.id, toId);
    res.status(201).json(out);
  } catch (e) {
    handleFriendError(e, res, next);
  }
}

export async function postAcceptFriendRequest(req, res, next) {
  try {
    const fromId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(fromId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const out = await acceptFriendRequest(req.user.id, fromId);
    res.json(out);
  } catch (e) {
    handleFriendError(e, res, next);
  }
}

export async function deleteFriendRequest(req, res, next) {
  try {
    const otherId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const out = await removeFriendRequest(req.user.id, otherId);
    res.json(out);
  } catch (e) {
    handleFriendError(e, res, next);
  }
}

export async function deleteFriend(req, res, next) {
  try {
    const friendId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const out = await unfriend(req.user.id, friendId);
    res.json(out);
  } catch (e) {
    handleFriendError(e, res, next);
  }
}

export async function postBlock(req, res, next) {
  try {
    const targetId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const out = await blockUser(req.user.id, targetId);
    res.json(out);
  } catch (e) {
    handleFriendError(e, res, next);
  }
}

export async function deleteBlock(req, res, next) {
  try {
    const targetId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const out = await unblockUser(req.user.id, targetId);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function getUserSearch(req, res, next) {
  try {
    const { q, limit } = req.query;
    const list = await searchUsers(req.user.id, q, limit);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function getPublicUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const u = await getPublicProfile(userId);
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json(u);
  } catch (e) {
    next(e);
  }
}
