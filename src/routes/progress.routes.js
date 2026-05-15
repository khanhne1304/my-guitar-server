import { Router } from 'express';
import { validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import * as progressCtrl from '../controllers/learning/progress.controller.js';
import {
  validateCompleteLesson,
  validateLogPractice,
  validateProgressCourseId,
} from '../validators/learning.validator.js';

const router = Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ', issues: errors.array() });
  }
  next();
}

router.post('/complete-lesson', protect, validateCompleteLesson, runValidation, progressCtrl.completeLesson);
router.post('/log-practice', protect, validateLogPractice, runValidation, progressCtrl.logPractice);
router.get('/:courseId', protect, validateProgressCourseId, runValidation, progressCtrl.getProgress);

export default router;
