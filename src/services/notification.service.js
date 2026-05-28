import Notification from '../models/Notification.js';
import ForumUserNotification from '../models/ForumUserNotification.js';

export async function listNotificationsAdmin({ page = 1, limit = 10, search, type, status }) {
  const skip = (page - 1) * limit;

  const query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];
  }

  if (type) {
    query.type = type;
  }

  if (status) {
    const now = new Date();
    if (status === 'active') {
      query.isActive = true;
      query.$and = [
        {
          $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }, { scheduledAt: { $lte: now } }],
        },
        {
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
        },
      ];
    } else if (status === 'expired') {
      query.expiresAt = { $lt: now };
    } else if (status === 'scheduled') {
      query.scheduledAt = { $gt: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    }
  }

  const total = await Notification.countDocuments(query);

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  const totalPages = Math.ceil(total / limit);

  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages,
      total,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
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

// ---------- Helpers: merged feed (system broadcast + forum inbox) ----------

function buildSystemQuery(userId, { type, unreadOnly }) {
  const now = new Date();
  const query = {
    isActive: true,
    $and: [
      {
        $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }, { scheduledAt: { $lte: now } }],
      },
      {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
      },
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'registered' },
          { targetAudience: 'specific', targetUsers: { $in: [userId] } },
        ],
      },
    ],
  };

  if (type && type !== 'forum') {
    query.type = type;
  }

  if (unreadOnly === 'true' || unreadOnly === true) {
    query.readBy = { $ne: userId };
  }

  return query;
}

/** Shape forum docs like legacy Notification API + feedKind for clients */
function normalizeForumFeed(doc, recipientId) {
  const uid = String(recipientId);
  const read = !!doc.readAt;
  return {
    _id: doc._id,
    title: doc.title,
    content: doc.preview,
    type: 'forum',
    priority: 'medium',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    readBy: read ? [{ user: uid }] : [],
    actionUrl: `/forum/thread/${doc.thread}`,
    actionText: 'Mở chủ đề',
    feedKind: 'forum',
    eventType: doc.eventType,
    imageUrl: undefined,
  };
}

/** Normalize system broadcast docs for consistent readBy / unread checks in React */
function normalizeSystemFeed(doc, userId) {
  const uid = String(userId);
  const readIds = (doc.readBy || []).map((x) => String(x));
  const read = readIds.includes(uid);
  return {
    ...doc,
    feedKind: 'system',
    readBy: read ? [{ user: uid }] : [],
  };
}

/**
 * Merged inbox: admin broadcast notifications + personal forum alerts.
 * Supports filter type=forum for forum-only rows.
 */
export async function listNotificationsForUser(userId, { page = 1, limit = 10, type, unreadOnly }) {
  const skip = (page - 1) * limit;

  // Forum-only listing
  if (type === 'forum') {
    const fq = { recipient: userId, hiddenAt: null };
    if (unreadOnly === 'true' || unreadOnly === true) fq.readAt = null;

    const total = await ForumUserNotification.countDocuments(fq);
    const docs = await ForumUserNotification.find(fq)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const notifications = docs.map((d) => normalizeForumFeed(d, userId));
    const unreadCount = await ForumUserNotification.countDocuments({
      recipient: userId,
      hiddenAt: null,
      readAt: null,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      unreadCount,
    };
  }

  // System-only (explicit marketing / order types, etc.)
  if (type && type !== 'forum') {
    const query = buildSystemQuery(userId, { type, unreadOnly });
    const total = await Notification.countDocuments(query);
    const raw = await Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const notifications = raw.map((d) => normalizeSystemFeed(d, userId));

    const unreadCount = await Notification.countDocuments({
      ...query,
      readBy: { $ne: userId },
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      unreadCount,
    };
  }

  // Merged: pull enough rows from each stream then sort & slice (good for moderate volumes)
  // Fetch enough rows from each stream for deep pagination when merging
  const take = Math.min(skip + limit + 200, 3000);
  const forumQuery = { recipient: userId, hiddenAt: null };
  if (unreadOnly === 'true' || unreadOnly === true) forumQuery.readAt = null;

  const systemQuery = buildSystemQuery(userId, { unreadOnly });

  const forumTotalQuery = { recipient: userId, hiddenAt: null };
  if (unreadOnly === 'true' || unreadOnly === true) forumTotalQuery.readAt = null;

  const [forumDocs, systemDocs, totalForum, totalSystem, forumUnread, systemUnread] = await Promise.all([
    ForumUserNotification.find(forumQuery).sort({ createdAt: -1 }).limit(take).lean(),
    Notification.find(systemQuery).sort({ createdAt: -1 }).limit(take).lean(),
    ForumUserNotification.countDocuments(forumTotalQuery),
    Notification.countDocuments(systemQuery),
    ForumUserNotification.countDocuments({ recipient: userId, hiddenAt: null, readAt: null }),
    Notification.countDocuments({ ...buildSystemQuery(userId, {}), readBy: { $ne: userId } }),
  ]);

  const merged = [
    ...forumDocs.map((d) => normalizeForumFeed(d, userId)),
    ...systemDocs.map((d) => normalizeSystemFeed(d, userId)),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const notifications = merged.slice(skip, skip + limit);
  const total = totalForum + totalSystem;
  const totalPages = Math.ceil(total / limit) || 1;
  const unreadCount = forumUnread + systemUnread;

  return {
    notifications,
    pagination: {
      currentPage: page,
      totalPages,
      total,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    unreadCount,
  };
}

export async function getUnreadCountForUser(userId) {
  const now = new Date();
  const systemQuery = {
    isActive: true,
    readBy: { $ne: userId },
    $and: [
      {
        $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }, { scheduledAt: { $lte: now } }],
      },
      {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
      },
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'registered' },
          { targetAudience: 'specific', targetUsers: { $in: [userId] } },
        ],
      },
    ],
  };

  const [systemUnread, forumUnread] = await Promise.all([
    Notification.countDocuments(systemQuery),
    ForumUserNotification.countDocuments({ recipient: userId, readAt: null, hiddenAt: null }),
  ]);

  return systemUnread + forumUnread;
}

export async function markAsRead(userId, notificationId) {
  const forum = await ForumUserNotification.findOne({ _id: notificationId, recipient: userId });
  if (forum) {
    if (!forum.readAt) {
      forum.readAt = new Date();
      await forum.save();
    }
    return normalizeForumFeed(forum.toObject(), userId);
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) throw new Error('NOT_FOUND');

  const now = new Date();
  const canView =
    notification.isActive &&
    (!notification.scheduledAt || notification.scheduledAt <= now) &&
    (!notification.expiresAt || notification.expiresAt >= now) &&
    (notification.targetAudience === 'all' ||
      notification.targetAudience === 'registered' ||
      (notification.targetAudience === 'specific' &&
        notification.targetUsers.some((id) => id.toString() === userId.toString())));

  if (!canView) throw new Error('NOT_AUTHORIZED');

  const userIdStr = userId.toString();
  const readByIds = notification.readBy.map((id) => id.toString());
  if (!readByIds.includes(userIdStr)) {
    notification.readBy.push(userId);
    await notification.save();
  }

  return normalizeSystemFeed(notification.toObject(), userId);
}

export async function markAllAsRead(userId) {
  const now = new Date();

  await ForumUserNotification.updateMany(
    { recipient: userId, readAt: null, hiddenAt: null },
    { $set: { readAt: new Date() } },
  );

  const query = {
    isActive: true,
    readBy: { $ne: userId },
    $and: [
      {
        $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }, { scheduledAt: { $lte: now } }],
      },
      {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
      },
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'registered' },
          { targetAudience: 'specific', targetUsers: { $in: [userId] } },
        ],
      },
    ],
  };

  await Notification.updateMany(query, { $addToSet: { readBy: userId } });
}

/** Soft-hide a forum inbox row from the merged feed */
export async function hideForumNotification(userId, notificationId) {
  const forum = await ForumUserNotification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { hiddenAt: new Date() } },
    { new: true },
  );
  return forum;
}
