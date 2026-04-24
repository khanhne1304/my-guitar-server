import { body } from 'express-validator';

export const validateCreate = [
  body('code').notEmpty().withMessage('code required'),
  body('type')
    .isIn(['percent', 'fixed'])
    .withMessage('type must be percent or fixed'),
  body('amount').isNumeric().withMessage('amount required'),
];
