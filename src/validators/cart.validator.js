import { body } from 'express-validator';

export const validateAddToCart = [
  body('productId').notEmpty().withMessage('productId required'),
  body('qty').optional().isInt({ min: 1 }).withMessage('qty >= 1'),
];
