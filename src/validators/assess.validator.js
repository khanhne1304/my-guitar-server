import { body, param, validationResult } from 'express-validator';

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

// Submit assessment validator
export const submitAssessmentValidator = [
  body('lessonKey')
    .matches(/^[a-z0-9-]+#\d+\.\d+$/)
    .withMessage('lessonKey phải có định dạng slug#module.lesson'),
  body('assessmentType')
    .isIn(['quiz', 'recording'])
    .withMessage('Loại đánh giá phải là quiz hoặc recording'),
  body('answers')
    .optional()
    .isArray()
    .withMessage('Câu trả lời phải là mảng'),
  body('recordingUrl')
    .optional()
    .isURL()
    .withMessage('URL recording không hợp lệ'),
  body('score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Điểm số phải từ 0 đến 100')
];

// Get assessment results validator
export const getAssessmentResultsValidator = [
  param('lessonKey')
    .matches(/^[a-z0-9-]+#\d+\.\d+$/)
    .withMessage('lessonKey phải có định dạng slug#module.lesson')
];
