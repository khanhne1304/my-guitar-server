import { body } from 'express-validator';

export const validateCreate = [
  body('name').notEmpty().withMessage('name required'),
];
