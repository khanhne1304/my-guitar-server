import { Router } from 'express';
import { protect } from '../middlewares/auth.js';  // chú ý: thư mục là "middlewares" (số nhiều)
import { getProfile, updateProfile, changePassword } from '../controllers/user.controller.js';
import {
  getFriends,
  getFriendRequests,
  postFriendRequest,
  postAcceptFriendRequest,
  deleteFriendRequest,
  deleteFriend,
  postBlock,
  deleteBlock,
  getUserSearch,
  getPublicUser,
} from '../controllers/friend.controller.js';
import { validateUpdateProfile } from '../validators/user.validator.js';
import { validationResult } from 'express-validator';
const router = Router();

// Middleware xử lý lỗi validate
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// --- Bạn bè / chặn / tìm kiếm (route cụ thể trước :userId) ---
router.get('/search', protect, getUserSearch);
router.get('/friends', protect, getFriends);
router.get('/friend-requests', protect, getFriendRequests);
router.post('/friend-requests/:userId/accept', protect, postAcceptFriendRequest);
router.post('/friend-requests/:userId', protect, postFriendRequest);
router.delete('/friend-requests/:userId', protect, deleteFriendRequest);
router.delete('/friends/:userId', protect, deleteFriend);
router.post('/blocks/:userId', protect, postBlock);
router.delete('/blocks/:userId', protect, deleteBlock);
router.get('/public/:userId', getPublicUser);

// Lấy thông tin profile
router.get('/profile', protect, getProfile);
router.put('/profile/password', protect, changePassword);
// Cập nhật profile
router.put('/profile', protect, validateUpdateProfile, validate, updateProfile);

export default router;
