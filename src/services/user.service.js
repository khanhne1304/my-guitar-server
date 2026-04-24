import User from '../models/User.js';
import bcrypt from 'bcrypt';

export async function getUserProfile(userId) {
  return await User.findById(userId).select('-password');
}

export async function updateUserProfile(userId, data) {
  // Loại bỏ password ngay từ đầu nếu có trong data
  if ('password' in data) delete data.password;

  // Chỉ lấy những field được phép sửa
  const allowedFields = [
    'username',
    'email',
    'fullName',
    'address',
    'phone',
    'avatarUrl',
    // Forum/social profile fields
    'bio',
    'location',
    'birthday',
    'education',
    'website',
    'facebookUrl',
    'youtubeUrl',
    'tiktokUrl',
  ];
  const updates = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) updates[key] = data[key];
  }

  // Dùng findByIdAndUpdate để tránh trigger pre-save hook của password
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  ).select('-password'); // luôn loại password khi trả về

  if (!updatedUser) throw new Error('NOT_FOUND');
  return updatedUser;
}

function pickPublicUserFields() {
  return 'username fullName avatarUrl bio location website facebookUrl youtubeUrl tiktokUrl createdAt';
}

export async function getPublicUserById(userId) {
  const user = await User.findById(userId).select(pickPublicUserFields()).lean();
  if (!user) throw new Error('NOT_FOUND');
  return user;
}

export async function searchUsers({ q, currentUserId, limit = 20 }) {
  const term = (q || '').trim();
  if (!term) return [];

  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ username: rx }, { fullName: rx }, { email: rx }],
  })
    .select(pickPublicUserFields())
    .limit(Math.min(Math.max(limit, 1), 50))
    .lean();

  return users;
}

export async function getFriends(userId) {
  const user = await User.findById(userId)
    .populate('friends', pickPublicUserFields())
    .select('friends blockedUsers')
    .lean();
  if (!user) throw new Error('NOT_FOUND');

  const blocked = new Set((user.blockedUsers || []).map(String));
  return (user.friends || []).filter((f) => !blocked.has(String(f?._id)));
}

export async function getFriendRequests(userId) {
  const user = await User.findById(userId)
    .populate('friendRequestsReceived', pickPublicUserFields())
    .select('friendRequestsReceived blockedUsers')
    .lean();
  if (!user) throw new Error('NOT_FOUND');

  const blocked = new Set((user.blockedUsers || []).map(String));
  return (user.friendRequestsReceived || []).filter((u) => !blocked.has(String(u?._id)));
}

export async function sendFriendRequest({ fromUserId, toUserId }) {
  if (!toUserId) throw new Error('BAD_REQUEST');
  if (String(fromUserId) === String(toUserId)) throw new Error('CANNOT_SELF');

  const [from, to] = await Promise.all([
    User.findById(fromUserId).select('friends friendRequestsSent blockedUsers'),
    User.findById(toUserId).select('friends friendRequestsReceived blockedUsers'),
  ]);

  if (!from || !to) throw new Error('NOT_FOUND');

  const fromBlocked = (from.blockedUsers || []).some((id) => String(id) === String(toUserId));
  const toBlocked = (to.blockedUsers || []).some((id) => String(id) === String(fromUserId));
  if (fromBlocked || toBlocked) throw new Error('BLOCKED');

  const alreadyFriends = (from.friends || []).some((id) => String(id) === String(toUserId));
  if (alreadyFriends) throw new Error('ALREADY_FRIENDS');

  const alreadySent = (from.friendRequestsSent || []).some((id) => String(id) === String(toUserId));
  const alreadyReceived = (to.friendRequestsReceived || []).some((id) => String(id) === String(fromUserId));
  if (alreadySent || alreadyReceived) throw new Error('ALREADY_REQUESTED');

  await Promise.all([
    User.updateOne({ _id: fromUserId }, { $addToSet: { friendRequestsSent: toUserId } }),
    User.updateOne({ _id: toUserId }, { $addToSet: { friendRequestsReceived: fromUserId } }),
  ]);

  return { ok: true };
}

export async function cancelOrDeclineFriendRequest({ currentUserId, otherUserId }) {
  if (!otherUserId) throw new Error('BAD_REQUEST');

  await Promise.all([
    // current user cancels sent request
    User.updateOne({ _id: currentUserId }, { $pull: { friendRequestsSent: otherUserId } }),
    User.updateOne({ _id: otherUserId }, { $pull: { friendRequestsReceived: currentUserId } }),

    // current user declines received request
    User.updateOne({ _id: currentUserId }, { $pull: { friendRequestsReceived: otherUserId } }),
    User.updateOne({ _id: otherUserId }, { $pull: { friendRequestsSent: currentUserId } }),
  ]);

  return { ok: true };
}

export async function acceptFriendRequest({ currentUserId, fromUserId }) {
  if (!fromUserId) throw new Error('BAD_REQUEST');
  if (String(currentUserId) === String(fromUserId)) throw new Error('CANNOT_SELF');

  const current = await User.findById(currentUserId).select('friendRequestsReceived friends');
  if (!current) throw new Error('NOT_FOUND');

  const hasRequest = (current.friendRequestsReceived || []).some((id) => String(id) === String(fromUserId));
  if (!hasRequest) throw new Error('NO_REQUEST');

  await Promise.all([
    User.updateOne(
      { _id: currentUserId },
      {
        $pull: { friendRequestsReceived: fromUserId },
        $addToSet: { friends: fromUserId },
      },
    ),
    User.updateOne(
      { _id: fromUserId },
      {
        $pull: { friendRequestsSent: currentUserId },
        $addToSet: { friends: currentUserId },
      },
    ),
  ]);

  return { ok: true };
}

export async function unfriend({ currentUserId, otherUserId }) {
  if (!otherUserId) throw new Error('BAD_REQUEST');

  await Promise.all([
    User.updateOne({ _id: currentUserId }, { $pull: { friends: otherUserId } }),
    User.updateOne({ _id: otherUserId }, { $pull: { friends: currentUserId } }),
  ]);

  return { ok: true };
}

export async function blockUser({ currentUserId, otherUserId }) {
  if (!otherUserId) throw new Error('BAD_REQUEST');
  if (String(currentUserId) === String(otherUserId)) throw new Error('CANNOT_SELF');

  await Promise.all([
    // add block
    User.updateOne({ _id: currentUserId }, { $addToSet: { blockedUsers: otherUserId } }),

    // remove friendship both ways
    User.updateOne({ _id: currentUserId }, { $pull: { friends: otherUserId } }),
    User.updateOne({ _id: otherUserId }, { $pull: { friends: currentUserId } }),

    // remove any pending requests both ways
    User.updateOne(
      { _id: currentUserId },
      { $pull: { friendRequestsSent: otherUserId, friendRequestsReceived: otherUserId } }
    ),
    User.updateOne(
      { _id: otherUserId },
      { $pull: { friendRequestsSent: currentUserId, friendRequestsReceived: currentUserId } }
    ),
  ]);

  return { ok: true };
}

export async function unblockUser({ currentUserId, otherUserId }) {
  if (!otherUserId) throw new Error('BAD_REQUEST');
  if (String(currentUserId) === String(otherUserId)) throw new Error('CANNOT_SELF');

  await User.updateOne({ _id: currentUserId }, { $pull: { blockedUsers: otherUserId } });
  return { ok: true };
}