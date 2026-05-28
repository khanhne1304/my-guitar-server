import { body, param } from 'express-validator';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const validateCreateCourse = [
  body('title').trim().notEmpty().withMessage('Tiêu đề là bắt buộc').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('thumbnail').optional().trim().isLength({ max: 500 }),
  body('level').optional().isIn(LEVELS),
  body('tags').optional().isArray(),
];

export const validateUpdateCourse = [
  param('id').isMongoId().withMessage('courseId không hợp lệ'),
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 5000 }),
  body('thumbnail').optional().trim().isLength({ max: 500 }),
  body('level').optional().isIn(LEVELS),
  body('tags').optional().isArray(),
];

export const validateCourseId = [param('id').isMongoId().withMessage('courseId không hợp lệ')];

export const validateCreateModule = [
  body('courseId').isMongoId().withMessage('courseId không hợp lệ'),
  body('title').trim().notEmpty().withMessage('Tiêu đề module là bắt buộc'),
  body('description').optional().trim().isLength({ max: 3000 }),
  body('order').optional().isInt({ min: 1 }),
];

export const validateUpdateModule = [
  param('id').isMongoId().withMessage('moduleId không hợp lệ'),
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().isLength({ max: 3000 }),
  body('order').optional().isInt({ min: 1 }),
];

export const validateModuleId = [param('id').isMongoId().withMessage('moduleId không hợp lệ')];

export const validateModuleIdParam = [param('moduleId').isMongoId().withMessage('moduleId không hợp lệ')];

export const validateCreateLesson = [
  body('moduleId').isMongoId().withMessage('moduleId không hợp lệ'),
  body('title').trim().notEmpty().withMessage('Tiêu đề bài học là bắt buộc'),
  body('content').optional().isString(),
  body('youtubeVideoId').trim().notEmpty().withMessage('youtubeVideoId là bắt buộc'),
  body('duration').optional().isInt({ min: 1 }),
  body('order').optional().isInt({ min: 1 }),
];

export const validateUpdateLesson = [
  param('id').isMongoId().withMessage('lessonId không hợp lệ'),
  body('title').optional().trim().notEmpty(),
  body('content').optional().isString(),
  body('youtubeVideoId').optional().trim().notEmpty(),
  body('duration').optional().isInt({ min: 1 }),
  body('order').optional().isInt({ min: 1 }),
];

export const validateLessonId = [param('id').isMongoId().withMessage('lessonId không hợp lệ')];

export const validateCreateQuiz = [
  body('moduleId').isMongoId().withMessage('moduleId không hợp lệ'),
  body('lessonId')
    .optional({ values: 'null' })
    .custom((v) => v === undefined || v === null || v === '' || /^[a-f\d]{24}$/i.test(String(v))),
  body('title').trim().notEmpty().withMessage('Tiêu đề quiz là bắt buộc'),
  body('questions').isArray({ min: 1 }).withMessage('Cần ít nhất 1 câu hỏi'),
  body('passingScore').optional().isInt({ min: 0, max: 100 }),
];

export const validateUpdateQuiz = [
  param('id').isMongoId().withMessage('quizId không hợp lệ'),
  body('title').optional().trim().notEmpty(),
  body('questions').optional().isArray({ min: 1 }),
  body('passingScore').optional().isInt({ min: 0, max: 100 }),
  body('lessonId')
    .optional({ values: 'null' })
    .custom((v) => v === undefined || v === null || v === '' || /^[a-f\d]{24}$/i.test(String(v))),
];

export const validateQuizId = [param('id').isMongoId().withMessage('quizId không hợp lệ')];

export const validateQuizSubmit = [
  param('id').isMongoId().withMessage('quizId không hợp lệ'),
  body('answers').isObject().withMessage('answers phải là object'),
];

export const validateCompleteLesson = [
  body('lessonId').isMongoId().withMessage('lessonId không hợp lệ'),
];

export const validateLogPractice = [
  body('moduleId').isMongoId().withMessage('moduleId không hợp lệ'),
  body('minutes').optional().isInt({ min: 0, max: 180 }),
];

export const validateProgressCourseId = [
  param('courseId').isMongoId().withMessage('courseId không hợp lệ'),
];

export const validatePracticeRoutine = [
  body('moduleId').isMongoId().withMessage('moduleId không hợp lệ'),
  body('exercises').optional().isArray(),
  body('estimatedMinutes').optional().isInt({ min: 1, max: 180 }),
];

export const validateChallengeSong = [
  body('moduleId').isMongoId().withMessage('moduleId không hợp lệ'),
  body('title').trim().notEmpty().withMessage('Tiêu đề bài hát là bắt buộc'),
  body('artist').optional().trim().isLength({ max: 200 }),
  body('youtubeUrl').trim().notEmpty().withMessage('youtubeUrl là bắt buộc'),
  body('difficulty').optional().isIn(DIFFICULTIES),
];
