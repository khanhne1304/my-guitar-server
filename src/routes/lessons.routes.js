import { Router } from 'express';
import { validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import * as lessonCtrl from '../controllers/learning/lesson.controller.js';
import {
  validateCreateLesson,
  validateUpdateLesson,
  validateLessonId,
} from '../validators/learning.validator.js';

const router = Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ', issues: errors.array() });
  }
  next();
}

router.post('/', protect, validateCreateLesson, runValidation, lessonCtrl.createLesson);
router.put('/:id', protect, validateUpdateLesson, runValidation, lessonCtrl.updateLesson);
router.delete('/:id', protect, validateLessonId, runValidation, lessonCtrl.deleteLesson);

export default router;
