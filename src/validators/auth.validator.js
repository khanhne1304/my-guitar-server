import { body } from 'express-validator';

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
    .notEmpty()
    .withMessage('Số điện thoại là bắt buộc')
    .matches(/^[0-9+()\s-]{8,20}$/)
    .withMessage('Số điện thoại không hợp lệ'),
];

export const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('identifier (email hoặc username) là bắt buộc'),
  body('password').notEmpty().withMessage('password là bắt buộc'),
];
