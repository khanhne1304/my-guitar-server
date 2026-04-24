import { body, param, query } from 'express-validator';

export const validateCreatePost = [
  body('content').isString().trim().notEmpty().withMessage('Nội dung không được để trống'),
  body('images').optional().isArray(),
  body('images.*').optional().isString(),
  body('videoUrl').optional().isString(),
];

export const validateUpdatePost = [
  param('id').isMongoId().withMessage('id không hợp lệ'),
  body('content').optional().isString(),
  body('images').optional().isArray(),
  body('images.*').optional().isString(),
  body('videoUrl').optional().isString(),
];

export const validateCreateComment = [
  param('postId').isMongoId().withMessage('postId không hợp lệ'),
  body('text').isString().trim().notEmpty().withMessage('Nội dung bình luận không được để trống'),
];

export const validateCreateReport = [
  param('postId').isMongoId().withMessage('postId không hợp lệ'),
  body('reason').isString().trim().notEmpty().withMessage('Lý do là bắt buộc'),
  body('note').optional().isString(),
];

export const validateListPosts = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

