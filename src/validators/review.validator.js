import { body } from 'express-validator';

export const validateCreateReview = [
  body('product').notEmpty().withMessage('product required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating 1..5'),
  body('comment').optional().isString(),
];
