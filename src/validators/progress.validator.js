import { body, param, query, validationResult } from 'express-validator';

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  next();
};

// Start lesson validator
export const startLessonValidator = [
  body('courseId')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ'),
  body('lessonKey')
    .matches(/^[a-z0-9-]+#\d+\.\d+$/)
    .withMessage('lessonKey phải có định dạng slug#module.lesson')
];

// Log practice validator
export const logPracticeValidator = [
  body('lessonKey')
    .matches(/^[a-z0-9-]+#\d+\.\d+$/)
    .withMessage('lessonKey phải có định dạng slug#module.lesson'),
  body('minutes')
    .isInt({ min: 1 })
    .withMessage('Thời gian luyện tập phải ít nhất 1 phút'),
  body('bpm')
    .optional()
    .isInt({ min: 60, max: 200 })
    .withMessage('BPM phải từ 60 đến 200'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Ghi chú không được vượt quá 500 ký tự')
];

// Complete lesson validator
export const completeLessonValidator = [
  body('lessonKey')
    .matches(/^[a-z0-9-]+#\d+\.\d+$/)
    .withMessage('lessonKey phải có định dạng slug#module.lesson'),
  body('score')
    .isInt({ min: 0, max: 100 })
    .withMessage('Điểm số phải từ 0 đến 100'),
  body('acquiredSkills')
    .optional()
    .isArray()
    .withMessage('Kỹ năng đạt được phải là mảng')
];

// Get lesson progress validator
export const getLessonProgressValidator = [
  param('lessonKey')
    .matches(/^[a-z0-9-]+#\d+\.\d+$/)
    .withMessage('lessonKey phải có định dạng slug#module.lesson')
];

// Get course progress validator
export const getCourseProgressValidator = [
  param('courseId')
    .isMongoId()
    .withMessage('ID khóa học không hợp lệ')
];

// Get next lesson validator
export const getNextLessonValidator = [
  query('course')
    .notEmpty()
    .withMessage('Tham số course là bắt buộc')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Course slug không hợp lệ')
];
