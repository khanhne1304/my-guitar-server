import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Lấy thông báo cho user hiện tại
export async function getUserNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type || '';
    const unreadOnly = req.query.unreadOnly === 'true';

    const skip = (page - 1) * limit;
    const now = new Date();

    // Tạo filter object cơ bản
    const baseFilter = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: now } }
      ],
      scheduledAt: { $lte: now }
    };

    // Filter theo loại thông báo
    if (type) {
      baseFilter.type = type;
    }

    // Filter theo đối tượng nhận
    const user = await User.findById(userId);
    const audienceFilters = [{ targetAudience: 'all' }];
    
    if (user) {
      audienceFilters.push({ targetAudience: 'registered' });
      
      // Có thể thêm logic cho premium users sau này
      if (user.role === 'premium') {
        audienceFilters.push({ targetAudience: 'premium' });
      }
      
      // Thông báo dành riêng cho user này
      audienceFilters.push({ targetUsers: userId });
    }

    // Tạo filter cuối cùng
    const filter = {
      ...baseFilter,
      $and: [
        { $or: audienceFilters }
      ]
    };

    // Filter chỉ thông báo chưa đọc
    if (unreadOnly) {
      filter['readBy.user'] = { $ne: userId };
    }

    const notifications = await Notification.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Đánh dấu thông báo đã được xem (không phải đã đọc)
    const notificationIds = notifications.map(n => n._id);
    await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $inc: { clickCount: 1 } }
    );

    const total = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Đếm số thông báo chưa đọc
    const unreadCount = await Notification.countDocuments({
      ...filter,
      'readBy.user': { $ne: userId }
    });

    res.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalNotifications: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      unreadCount
    });
  } catch (error) {
    next(error);
  }
}

// Đánh dấu thông báo là đã đọc
export async function markNotificationAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    // Kiểm tra xem user đã đọc chưa
    const alreadyRead = notification.readBy.some(
      read => read.user.toString() === userId
    );

    if (!alreadyRead) {
      notification.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await notification.save();
    }

    res.json({ message: 'Đã đánh dấu thông báo là đã đọc' });
  } catch (error) {
    next(error);
  }
}

// Đánh dấu tất cả thông báo là đã đọc
export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    // Lấy tất cả thông báo chưa đọc của user
    const unreadNotifications = await Notification.find({
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ],
      scheduledAt: { $lte: new Date() },
      'readBy.user': { $ne: userId }
    });

    // Đánh dấu tất cả là đã đọc
    for (const notification of unreadNotifications) {
      notification.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await notification.save();
    }

    res.json({ 
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      markedCount: unreadNotifications.length
    });
  } catch (error) {
    next(error);
  }
}

// Lấy số lượng thông báo chưa đọc
export async function getUnreadNotificationCount(req, res, next) {
  try {
    const userId = req.user.id;
    const now = new Date();

    const unreadCount = await Notification.countDocuments({
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: now } }
      ],
      scheduledAt: { $lte: now },
      'readBy.user': { $ne: userId }
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
}

// Xóa thông báo khỏi danh sách của user (ẩn thông báo)
export async function hideNotification(req, res, next) {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    // Thêm user vào danh sách đã đọc để ẩn thông báo
    const alreadyRead = notification.readBy.some(
      read => read.user.toString() === userId
    );

    if (!alreadyRead) {
      notification.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await notification.save();
    }

    res.json({ message: 'Đã ẩn thông báo' });
  } catch (error) {
    next(error);
  }
}
