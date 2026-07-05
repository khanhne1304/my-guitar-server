import { body } from 'express-validator';

export const validateCreate = [
  body('name').trim().notEmpty().withMessage('Tên thương hiệu là bắt buộc'),
  body('country').optional({ nullable: true }).isString().withMessage('country must be a string'),
  body('categories').optional().isArray().withMessage('categories must be an array'),
  body('categories.*').optional().isMongoId().withMessage('Invalid category id'),
];

export const validateUpdate = [
  body('name').optional().trim().notEmpty().withMessage('Tên thương hiệu không được để trống'),
  body('country').optional({ nullable: true }).isString().withMessage('country must be a string'),
  body('categories').optional().isArray().withMessage('categories must be an array'),
  body('categories.*').optional().isMongoId().withMessage('Invalid category id'),
];
