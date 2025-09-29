import { Router } from 'express';
import { protect } from '../middlewares/auth.js';  // chú ý: thư mục là "middlewares" (số nhiều)
import { getProfile, updateProfile, changePassword } from '../controllers/user.controller.js';
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

// Lấy thông tin profile
router.get('/profile', protect, getProfile);
router.put('/profile/password', protect, changePassword);
// Cập nhật profile
router.put('/profile', protect, validateUpdateProfile, validate, updateProfile);

export default router;
