import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

// ===== Validators =====
export const validateRegister = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username là bắt buộc')
    .isLength({ min: 3, max: 30 })
    .withMessage('username 3-30 ký tự')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('username chỉ chứa chữ, số, ., _, -'),
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu tối thiểu 6 ký tự'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('fullName quá dài'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('address quá dài'),
  body('phone')
    .optional()
    .matches(/^[0-9+()\s-]{8,20}$/)
    .withMessage('Số điện thoại không hợp lệ'),
];

export const validateLogin = [
  // identifier: có thể là username hoặc email
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('identifier (email hoặc username) là bắt buộc'),
  body('password').notEmpty().withMessage('password là bắt buộc'),
];

// ===== Helpers =====
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' },
  );
}

// ===== Controllers =====
export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { username, email, fullName, address, phone, password } = req.body;

    // Check trùng username/email
    const existed = await User.findOne({
      $or: [{ username }, { email }],
    }).lean();
    if (existed) {
      if (existed.username === username) {
        return res.status(409).json({ message: 'Username đã tồn tại' });
      }
      if (existed.email === email) {
        return res.status(409).json({ message: 'Email đã tồn tại' });
      }
      return res.status(409).json({ message: 'Tài khoản đã tồn tại' });
    }

    // Tạo user
    const user = await User.create({
      username,
      email,
      fullName: fullName || '',
      address: address || '',
      phone: phone || '',
      password, // sẽ được hash bởi pre('save')
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        address: user.address,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (e) {
    // Lỗi duplicate index (E11000)
    if (e?.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${field} đã tồn tại` });
    }
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { identifier, password } = req.body;

    // Chuẩn hoá email nếu người dùng nhập email
    const maybeEmail = identifier.includes('@')
      ? identifier.toLowerCase()
      : identifier;

    // Tìm theo email (lowercase) HOẶC username
    const user = await User.findOne({
      $or: [{ email: maybeEmail }, { username: identifier }],
    }).select('+password');

    if (!user)
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

    const ok = await user.comparePassword(password);
    if (!ok)
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' },
    );

    // Trả về thông tin cần thiết (không trả password)
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        address: user.address,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
}
