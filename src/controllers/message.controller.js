import mongoose from 'mongoose';
import {
  listConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  currentUserId,
} from '../services/message.service.js';

function handleMessageError(e, res, next) {
  if (e.status) {
    return res.status(e.status).json({ message: e.message });
  }
  return next(e);
}

export async function getUnreadMessagesCount(req, res, next) {
  try {
    const userId = currentUserId(req.user);
    const unreadCount = await getUnreadCount(userId);
    res.json({ unreadCount });
  } catch (e) {
    next(e);
  }
}

export async function getConversations(req, res, next) {
  try {
    const userId = currentUserId(req.user);
    const list = await listConversations(userId);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function getThread(req, res, next) {
  try {
    const otherId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const userId = currentUserId(req.user);
    const { before, limit } = req.query;
    const messages = await getMessages(userId, otherId, { before, limit });
    res.json({ messages });
  } catch (e) {
    handleMessageError(e, res, next);
  }
}

export async function postMessage(req, res, next) {
  try {
    const otherId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const userId = currentUserId(req.user);
    const { text } = req.body || {};
    const message = await sendMessage(userId, otherId, text);
    res.status(201).json({ message });
  } catch (e) {
    handleMessageError(e, res, next);
  }
}
