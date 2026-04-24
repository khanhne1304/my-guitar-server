import { body } from 'express-validator';

export const validateProductCreate = [
  body('name').notEmpty().withMessage('name required'),
  body('price.base').isNumeric().withMessage('price.base must be number'),
  body('stock').optional().isInt({ min: 0 }),
];

export const validateProductUpdate = [
  body('price.base').optional().isNumeric(),
  body('stock').optional().isInt({ min: 0 }),
];
