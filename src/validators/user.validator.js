import { body } from 'express-validator';

export const validateUpdateProfile = [
  body('email').optional().isEmail().withMessage('Email không hợp lệ'),
  body('phone')
    .optional()
    .matches(/^[0-9+()\s-]{8,20}$/)
    .withMessage('Số điện thoại không hợp lệ'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Mật khẩu tối thiểu 6 ký tự'),
];
