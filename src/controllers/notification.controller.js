import {
  listNotificationsAdmin,
  createNotification,
  getNotificationById,
  updateNotification,
  deleteNotification,
  listNotificationsForUser,
  getUnreadCountForUser,
  markAsRead,
  markAllAsRead,
} from '../services/notification.service.js';

export async function listAdmin(req, res, next) {
  try {
    const { page = 1, limit = 10, search, type, status } = req.query;
    const result = await listNotificationsAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      type,
      status
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const notification = await createNotification(req.body);
    res.status(201).json(notification);
  } catch (e) {
    next(e);
  }
}

export async function getById(req, res, next) {
  try {
    const notification = await getNotificationById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    res.json(notification);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const notification = await updateNotification(req.params.id, req.body);
    if (!notification) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    res.json(notification);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const notification = await deleteNotification(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}

// Controllers cho user
export async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, type, unreadOnly } = req.query;
    const userId = req.user.id;
    const result = await listNotificationsForUser(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      unreadOnly
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;
    const unreadCount = await getUnreadCountForUser(userId);
    res.json({ unreadCount });
  } catch (e) {
    next(e);
  }
}

export async function markNotificationAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notification = await markAsRead(userId, req.params.id);
    res.json(notification);
  } catch (e) {
    if (e.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    if (e.message === 'NOT_AUTHORIZED')
      return res.status(403).json({ message: 'Bạn không có quyền xem thông báo này' });
    next(e);
  }
}

export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    await markAllAsRead(userId);
    res.json({ message: 'Đã đánh dấu tất cả thông báo đã đọc' });
  } catch (e) {
    next(e);
  }
}

