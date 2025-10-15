import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getLessonById,
  updateLessonProgress,
  getLessonProgress,
  getCourseProgress,
  markLessonCompleted,
  addPracticeTime,
  handleValidationErrors
} from '../controllers/lesson.controller.js';

const router = express.Router();

// Public routes (no authentication required)
// GET /api/lessons/:id - Get lesson details
router.get(
  '/:id',
  getLessonById
);

// Protected routes (authentication required)
router.use(protect);

// GET /api/lessons/:id/progress - Get lesson progress
router.get(
  '/:id/progress',
  getLessonProgress
);

// PATCH /api/lessons/:id/progress - Update lesson progress
router.patch(
  '/:id/progress',
  updateLessonProgress
);

// PATCH /api/lessons/:id/complete - Mark lesson as completed
router.patch(
  '/:id/complete',
  markLessonCompleted
);

// POST /api/lessons/:id/practice - Add practice time
router.post(
  '/:id/practice',
  addPracticeTime
);

export default router;
