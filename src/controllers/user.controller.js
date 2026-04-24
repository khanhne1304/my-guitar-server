import {
  getUserProfile,
  getPublicUserById,
  updateUserProfile,
  searchUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  cancelOrDeclineFriendRequest,
  unfriend,
  blockUser,
  unblockUser,
} from '../services/user.service.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';
export async function getProfile(req, res, next) {
  try {
    const user = await getUserProfile(req.user.id);
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function getPublicUserController(req, res, next) {
  try {
    const userId = req.params.userId;
    const user = await getPublicUserById(userId);
    res.json(user);
  } catch (e) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ message: 'User not found' });
    next(e);
  }
}

export async function searchUsersController(req, res, next) {
  try {
    const q = req.query.q || '';
    const limit = Number(req.query.limit || 20);
    const users = await searchUsers({ q, currentUserId: req.user.id, limit });
    res.json(users);
  } catch (e) {
    next(e);
  }
}

export async function getFriendsController(req, res, next) {
  try {
    const friends = await getFriends(req.user.id);
    res.json(friends);
  } catch (e) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ message: 'User not found' });
    next(e);
  }
}

export async function getFriendRequestsController(req, res, next) {
  try {
    const requests = await getFriendRequests(req.user.id);
    res.json(requests);
  } catch (e) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ message: 'User not found' });
    next(e);
  }
}

export async function sendFriendRequestController(req, res, next) {
  try {
    const toUserId = req.params.userId;
    await sendFriendRequest({ fromUserId: req.user.id, toUserId });
    res.json({ ok: true });
  } catch (e) {
    const map = {
      BAD_REQUEST: [400, 'Bad request'],
      CANNOT_SELF: [400, 'Không thể tự kết bạn'],
      NOT_FOUND: [404, 'User not found'],
      ALREADY_FRIENDS: [400, 'Đã là bạn bè'],
      ALREADY_REQUESTED: [400, 'Đã gửi lời mời trước đó'],
      BLOCKED: [400, 'Không thể gửi lời mời (đã bị chặn hoặc bạn đã chặn)'],
    };
    if (map[e.message]) return res.status(map[e.message][0]).json({ message: map[e.message][1] });
    next(e);
  }
}

export async function acceptFriendRequestController(req, res, next) {
  try {
    const fromUserId = req.params.userId;
    await acceptFriendRequest({ currentUserId: req.user.id, fromUserId });
    res.json({ ok: true });
  } catch (e) {
    const map = {
      BAD_REQUEST: [400, 'Bad request'],
      CANNOT_SELF: [400, 'Không thể tự kết bạn'],
      NOT_FOUND: [404, 'User not found'],
      NO_REQUEST: [400, 'Không tìm thấy lời mời kết bạn'],
    };
    if (map[e.message]) return res.status(map[e.message][0]).json({ message: map[e.message][1] });
    next(e);
  }
}

export async function cancelOrDeclineFriendRequestController(req, res, next) {
  try {
    const otherUserId = req.params.userId;
    await cancelOrDeclineFriendRequest({ currentUserId: req.user.id, otherUserId });
    res.json({ ok: true });
  } catch (e) {
    const map = {
      BAD_REQUEST: [400, 'Bad request'],
    };
    if (map[e.message]) return res.status(map[e.message][0]).json({ message: map[e.message][1] });
    next(e);
  }
}

export async function unfriendController(req, res, next) {
  try {
    const otherUserId = req.params.userId;
    await unfriend({ currentUserId: req.user.id, otherUserId });
    res.json({ ok: true });
  } catch (e) {
    const map = {
      BAD_REQUEST: [400, 'Bad request'],
    };
    if (map[e.message]) return res.status(map[e.message][0]).json({ message: map[e.message][1] });
    next(e);
  }
}

export async function blockUserController(req, res, next) {
  try {
    const otherUserId = req.params.userId;
    await blockUser({ currentUserId: req.user.id, otherUserId });
    res.json({ ok: true });
  } catch (e) {
    const map = {
      BAD_REQUEST: [400, 'Bad request'],
      CANNOT_SELF: [400, 'Không thể tự chặn'],
    };
    if (map[e.message]) return res.status(map[e.message][0]).json({ message: map[e.message][1] });
    next(e);
  }
}

export async function unblockUserController(req, res, next) {
  try {
    const otherUserId = req.params.userId;
    await unblockUser({ currentUserId: req.user.id, otherUserId });
    res.json({ ok: true });
  } catch (e) {
    const map = {
      BAD_REQUEST: [400, 'Bad request'],
      CANNOT_SELF: [400, 'Không thể tự bỏ chặn'],
    };
    if (map[e.message]) return res.status(map[e.message][0]).json({ message: map[e.message][1] });
    next(e);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Mật khẩu mới tối thiểu 6 ký tự" });

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

    // ❌ Đừng hash ở đây → để pre-save tự hash
    user.password = newPassword;
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (e) {
    next(e);
  }
}
export async function updateProfile(req, res, next) {
  try {
    if ('password' in req.body) delete req.body.password; // double-check an toàn
    const user = await updateUserProfile(req.user.id, req.body);
    res.json(user); // đã select -password ở service
  } catch (e) {
    if (e.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'User not found' });
    }
    next(e);
  }
}

export async function uploadAvatar(req, res, next) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'Thiếu file avatar' });

    const result = await uploadImageToCloudinary(file.buffer, file.originalname || 'avatar', 'user-avatar');
    const avatarUrl = result?.secure_url || result?.url;
    if (!avatarUrl) return res.status(500).json({ message: 'Upload thất bại' });

    const user = await updateUserProfile(req.user.id, { avatarUrl });
    res.json({ avatarUrl, user });
  } catch (e) {
    next(e);
  }
}