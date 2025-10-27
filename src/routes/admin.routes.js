import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  deleteUser,
  getUserStats
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

export default router;
