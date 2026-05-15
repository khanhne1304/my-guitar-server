import { Router } from 'express';
import { validationResult } from 'express-validator';
import { protect, optionalAuth } from '../middlewares/auth.js';
import * as courseCtrl from '../controllers/learning/course.controller.js';
import {
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseId,
} from '../validators/learning.validator.js';

const router = Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ', issues: errors.array() });
  }
  next();
}

router.get('/', optionalAuth, courseCtrl.listCourses);
router.get('/:id', optionalAuth, validateCourseId, runValidation, courseCtrl.getCourse);
router.post('/', protect, validateCreateCourse, runValidation, courseCtrl.createCourse);
router.put('/:id', protect, validateUpdateCourse, runValidation, courseCtrl.updateCourse);
router.delete('/:id', protect, validateCourseId, runValidation, courseCtrl.deleteCourse);
router.patch('/:id/publish', protect, validateCourseId, runValidation, courseCtrl.publishCourse);

export default router;
