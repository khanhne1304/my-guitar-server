import Notification from '../models/Notification.js';

export async function listNotificationsAdmin({ page = 1, limit = 10, search, type, status }) {
  const skip = (page - 1) * limit;
  
  // Xây dựng query
  const query = {};
  
  // Tìm kiếm theo title hoặc content
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Lọc theo type
  if (type) {
    query.type = type;
  }
  
  // Lọc theo status
  if (status) {
    const now = new Date();
    if (status === 'active') {
      query.isActive = true;
      query.$and = [
        {
          $or: [
            { scheduledAt: { $exists: false } },
            { scheduledAt: null },
            { scheduledAt: { $lte: now } }
          ]
        },
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: now } }
          ]
        }
      ];
    } else if (status === 'expired') {
      query.expiresAt = { $lt: now };
    } else if (status === 'scheduled') {
      query.scheduledAt = { $gt: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    }
  }
  
  // Đếm tổng số notifications
  const total = await Notification.countDocuments(query);
  
  // Lấy danh sách notifications
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages,
      total,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

export async function createNotification(data) {
  return await Notification.create(data);
}

export async function getNotificationById(id) {
  return await Notification.findById(id);
}

export async function updateNotification(id, data) {
  return await Notification.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteNotification(id) {
  return await Notification.findByIdAndDelete(id);
}

// Services cho user
export async function listNotificationsForUser(userId, { page = 1, limit = 10, type, unreadOnly }) {
  const skip = (page - 1) * limit;
  const now = new Date();
  
  // Xây dựng query cho notifications mà user có thể xem
  const query = {
    isActive: true,
    $and: [
      {
        $or: [
          { scheduledAt: { $exists: false } },
          { scheduledAt: null },
          { scheduledAt: { $lte: now } }
        ]
      },
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gte: now } }
        ]
      },
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'registered' }, // Tất cả user đã đăng ký
          { targetAudience: 'specific', targetUsers: { $in: [userId] } }
        ]
      }
    ]
  };
  
  // Lọc theo type
  if (type) {
    query.type = type;
  }
  
  // Lọc theo unreadOnly
  if (unreadOnly === 'true' || unreadOnly === true) {
    query.readBy = { $ne: userId };
  }
  
  // Đếm tổng số notifications
  const total = await Notification.countDocuments(query);
  
  // Lấy danh sách notifications
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  // Tính toán unread count (số notifications chưa đọc)
  const unreadCount = await Notification.countDocuments({
    ...query,
    readBy: { $ne: userId }
  });
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages,
      total,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    unreadCount
  };
}

export async function getUnreadCountForUser(userId) {
  const now = new Date();
  
  const query = {
    isActive: true,
    readBy: { $ne: userId },
    $and: [
      {
        $or: [
          { scheduledAt: { $exists: false } },
          { scheduledAt: null },
          { scheduledAt: { $lte: now } }
        ]
      },
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gte: now } }
        ]
      },
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'registered' },
          { targetAudience: 'specific', targetUsers: { $in: [userId] } }
        ]
      }
    ]
  };
  
  return await Notification.countDocuments(query);
}

export async function markAsRead(userId, notificationId) {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new Error('NOT_FOUND');
  
  // Kiểm tra xem user có quyền xem notification này không
  const now = new Date();
  const canView = 
    notification.isActive &&
    (!notification.scheduledAt || notification.scheduledAt <= now) &&
    (!notification.expiresAt || notification.expiresAt >= now) &&
    (
      notification.targetAudience === 'all' ||
      notification.targetAudience === 'registered' ||
      (notification.targetAudience === 'specific' && 
       notification.targetUsers.some(id => id.toString() === userId.toString()))
    );
  
  if (!canView) throw new Error('NOT_AUTHORIZED');
  
  // Thêm userId vào readBy nếu chưa có
  const userIdStr = userId.toString();
  const readByIds = notification.readBy.map(id => id.toString());
  if (!readByIds.includes(userIdStr)) {
    notification.readBy.push(userId);
    await notification.save();
  }
  
  return notification;
}

export async function markAllAsRead(userId) {
  const now = new Date();
  
  const query = {
    isActive: true,
    readBy: { $ne: userId },
    $and: [
      {
        $or: [
          { scheduledAt: { $exists: false } },
          { scheduledAt: null },
          { scheduledAt: { $lte: now } }
        ]
      },
      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gte: now } }
        ]
      },
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'registered' },
          { targetAudience: 'specific', targetUsers: { $in: [userId] } }
        ]
      }
    ]
  };
  
  const result = await Notification.updateMany(
    query,
    { $addToSet: { readBy: userId } }
  );
  
  return result;
}

