import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/user.controller.js';

const router = Router();

// Lấy thông tin profile
router.get('/profile', protect, getProfile);

// Cập nhật profile
router.put('/profile', protect, updateProfile);

export default router;
