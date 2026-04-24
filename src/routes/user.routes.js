import { Router } from 'express';
import { protect } from '../middlewares/auth.js';  // chú ý: thư mục là "middlewares" (số nhiều)
import {
  getProfile,
  getPublicUserController,
  updateProfile,
  changePassword,
  uploadAvatar,
  searchUsersController,
  getFriendsController,
  getFriendRequestsController,
  sendFriendRequestController,
  acceptFriendRequestController,
  cancelOrDeclineFriendRequestController,
  unfriendController,
  blockUserController,
  unblockUserController,
} from '../controllers/user.controller.js';
import { validateUpdateProfile } from '../validators/user.validator.js';
import { validationResult } from 'express-validator';
import { imageUpload } from '../middlewares/imageUpload.js';
const router = Router();

// Middleware xử lý lỗi validate
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// Lấy thông tin profile
router.get('/profile', protect, getProfile);
router.put('/profile/password', protect, changePassword);
// Cập nhật profile
router.put('/profile', protect, validateUpdateProfile, validate, updateProfile);
// Upload avatar
router.put('/profile/avatar', protect, imageUpload.single('avatar'), uploadAvatar);

// Public-ish profile by id (still requires auth)
router.get('/public/:userId', protect, getPublicUserController);

// --- Friends / search ---
router.get('/search', protect, searchUsersController); // ?q=...
router.get('/friends', protect, getFriendsController);
router.get('/friend-requests', protect, getFriendRequestsController);
router.post('/friend-requests/:userId', protect, sendFriendRequestController);
router.post('/friend-requests/:userId/accept', protect, acceptFriendRequestController);
router.delete('/friend-requests/:userId', protect, cancelOrDeclineFriendRequestController); // cancel or decline
router.delete('/friends/:userId', protect, unfriendController);
router.post('/blocks/:userId', protect, blockUserController);
router.delete('/blocks/:userId', protect, unblockUserController);

export default router;
