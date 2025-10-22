import { body } from 'express-validator';

export const validateSongCreate = [
  body('title').notEmpty().withMessage('Thiếu tên bài hát'),
  body('lyrics').notEmpty().withMessage('Thiếu lời bài hát'),
  body('excerpt').notEmpty().withMessage('Thiếu tóm tắt bài hát'),
  body('tags').notEmpty().withMessage('Vui lòng điền vào trường Hợp âm'),
  body('artists').optional().isArray().withMessage('artists must be array of strings'),
  body('postedAt').optional().custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Cho phép null/undefined/empty
    }
    return new Date(value).toISOString() !== 'Invalid Date';
  }).withMessage('Ngày đăng không hợp lệ'),
  body('views').optional().isInt({ min: 0 }),
  body('tempo').optional().isInt({ min: 30, max: 300 }),
  body('timeSignature').optional().matches(/^\d+\/\d+$/),
];

export const validateSongUpdate = [
  body('title').optional().isString(),
  body('lyrics').optional().isString(),
  body('excerpt').notEmpty().withMessage('Thiếu tóm tắt bài hát'),
  body('artists').optional().isArray(),
  body('postedAt').optional().custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Cho phép null/undefined/empty
    }
    return new Date(value).toISOString() !== 'Invalid Date';
  }).withMessage('Ngày đăng không hợp lệ'),
  body('views').optional().isInt({ min: 0 }),
  body('tempo').optional().isInt({ min: 30, max: 300 }),
  body('timeSignature').optional().matches(/^\d+\/\d+$/),
];


