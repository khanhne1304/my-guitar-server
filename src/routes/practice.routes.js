import { Router } from 'express';
import { validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import * as practiceCtrl from '../controllers/learning/practice.controller.js';
import { validatePracticeRoutine, validateModuleIdParam } from '../validators/learning.validator.js';

const router = Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ', issues: errors.array() });
  }
  next();
}

router.put('/', protect, validatePracticeRoutine, runValidation, practiceCtrl.upsertPractice);
router.delete('/:moduleId', protect, validateModuleIdParam, runValidation, practiceCtrl.deletePractice);

export default router;
