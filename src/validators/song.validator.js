import { body } from 'express-validator';

export const validateSongCreate = [
  body('title').notEmpty().withMessage('title required'),
  body('lyrics').notEmpty().withMessage('lyrics required'),
  body('artists').optional().isArray().withMessage('artists must be array of strings'),
  body('postedAt').optional().isISO8601().toDate(),
  body('views').optional().isInt({ min: 0 }),
  body('tempo').optional().isInt({ min: 30, max: 300 }),
  body('timeSignature').optional().matches(/^\d+\/\d+$/),
];

export const validateSongUpdate = [
  body('title').optional().isString(),
  body('lyrics').optional().isString(),
  body('artists').optional().isArray(),
  body('postedAt').optional().isISO8601().toDate(),
  body('views').optional().isInt({ min: 0 }),
  body('tempo').optional().isInt({ min: 30, max: 300 }),
  body('timeSignature').optional().matches(/^\d+\/\d+$/),
];


