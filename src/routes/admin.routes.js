import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  deleteUser,
  getUserStats,
  // Review management
  getAllReviews,
  deleteReview,
  // Coupon management
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  // Notification management
  getAllNotifications,
  createNotification,
  updateNotification,
  deleteNotification
} from '../controllers/admin.controller.js';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';

const router = Router();

// Middleware xử lý lỗi validate
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules
const validateCreateUser = [
  body('username').notEmpty().withMessage('Username là bắt buộc'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu tối thiểu 6 ký tự'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role phải là user hoặc admin')
];

const validateUpdateUser = [
  body('email').optional().isEmail().withMessage('Email không hợp lệ'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role phải là user hoặc admin')
];

const validateChangePassword = [
  body('newPassword').isLength({ min: 6 }).withMessage('Mật khẩu mới tối thiểu 6 ký tự')
];

// Validation rules for Coupon
const validateCreateCoupon = [
  body('code').notEmpty().withMessage('Mã khuyến mãi là bắt buộc'),
  body('type').isIn(['percent', 'fixed']).withMessage('Loại khuyến mãi phải là percent hoặc fixed'),
  body('amount').isNumeric().withMessage('Số tiền giảm phải là số'),
  body('amount').custom((value, { req }) => {
    if (req.body.type === 'percent' && (value < 1 || value > 100)) {
      throw new Error('Phần trăm giảm phải từ 1-100');
    }
    return true;
  })
];

const validateUpdateCoupon = [
  body('type').optional().isIn(['percent', 'fixed']).withMessage('Loại khuyến mãi phải là percent hoặc fixed'),
  body('amount').optional().isNumeric().withMessage('Số tiền giảm phải là số')
];

// Validation rules for Notification
const validateCreateNotification = [
  body('title').notEmpty().withMessage('Tiêu đề thông báo là bắt buộc'),
  body('content').notEmpty().withMessage('Nội dung thông báo là bắt buộc'),
  body('type').optional().isIn(['general', 'promotion', 'system', 'order', 'product']).withMessage('Loại thông báo không hợp lệ'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Mức độ ưu tiên không hợp lệ'),
  body('targetAudience').optional().isIn(['all', 'registered', 'premium', 'specific']).withMessage('Đối tượng nhận không hợp lệ')
];

const validateUpdateNotification = [
  body('type').optional().isIn(['general', 'promotion', 'system', 'order', 'product']).withMessage('Loại thông báo không hợp lệ'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Mức độ ưu tiên không hợp lệ'),
  body('targetAudience').optional().isIn(['all', 'registered', 'premium', 'specific']).withMessage('Đối tượng nhận không hợp lệ')
];

// Tất cả routes đều yêu cầu authentication và admin role
router.use(protect);
router.use(admin);

// Routes quản lý users
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.get('/users/:id', getUserById);
router.post('/users', validateCreateUser, validate, createUser);
router.put('/users/:id', validateUpdateUser, validate, updateUser);
router.put('/users/:id/password', validateChangePassword, validate, changeUserPassword);
router.delete('/users/:id', deleteUser);

// Routes quản lý reviews/comments
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);

// Routes quản lý coupons
router.get('/coupons', getAllCoupons);
router.post('/coupons', validateCreateCoupon, validate, createCoupon);
router.put('/coupons/:id', validateUpdateCoupon, validate, updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Routes quản lý notifications
router.get('/notifications', getAllNotifications);
router.post('/notifications', validateCreateNotification, validate, createNotification);
router.put('/notifications/:id', validateUpdateNotification, validate, updateNotification);
router.delete('/notifications/:id', deleteNotification);

export default router;
