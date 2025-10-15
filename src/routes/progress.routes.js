import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  startLesson,
  logPractice,
  completeLesson,
  getLessonProgress,
  getCourseProgress,
  getNextLesson
} from '../controllers/progress.controller.js';
import {
  startLessonValidator,
  logPracticeValidator,
  completeLessonValidator,
  getLessonProgressValidator,
  getCourseProgressValidator,
  getNextLessonValidator,
  handleValidationErrors
} from '../validators/progress.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/progress/start - Start a lesson
router.post(
  '/start',
  startLessonValidator,
  handleValidationErrors,
  startLesson
);

// POST /api/progress/log-practice - Log practice session
router.post(
  '/log-practice',
  logPracticeValidator,
  handleValidationErrors,
  logPractice
);

// POST /api/progress/complete - Complete a lesson
router.post(
  '/complete',
  completeLessonValidator,
  handleValidationErrors,
  completeLesson
);

// GET /api/progress/lesson/:lessonKey - Get lesson progress
router.get(
  '/lesson/:lessonKey',
  getLessonProgressValidator,
  handleValidationErrors,
  getLessonProgress
);

// GET /api/progress/course/:courseId - Get course progress
router.get(
  '/course/:courseId',
  getCourseProgressValidator,
  handleValidationErrors,
  getCourseProgress
);

// GET /api/progress/next-lesson - Get next recommended lesson
router.get(
  '/next-lesson',
  getNextLessonValidator,
  handleValidationErrors,
  getNextLesson
);

// GET /api/progress/:courseId - Get user progress for a course (as per requirements)
router.get(
  '/:courseId',
  getCourseProgressValidator,
  handleValidationErrors,
  getCourseProgress
);

// POST /api/progress/:lessonId - Update lesson progress (as per requirements)
router.post(
  '/:lessonId',
  completeLessonValidator,
  handleValidationErrors,
  completeLesson
);

export default router;
