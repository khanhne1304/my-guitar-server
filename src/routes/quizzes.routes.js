import { Router } from 'express';
import { validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import * as quizCtrl from '../controllers/learning/quiz.controller.js';
import {
  validateCreateQuiz,
  validateUpdateQuiz,
  validateQuizId,
  validateQuizSubmit,
} from '../validators/learning.validator.js';

const router = Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ', issues: errors.array() });
  }
  next();
}

router.post('/', protect, validateCreateQuiz, runValidation, quizCtrl.createQuiz);
router.get('/:id', protect, validateQuizId, runValidation, quizCtrl.getQuiz);
router.put('/:id', protect, validateUpdateQuiz, runValidation, quizCtrl.updateQuiz);
router.delete('/:id', protect, validateQuizId, runValidation, quizCtrl.deleteQuiz);
router.post('/:id/submit', protect, validateQuizSubmit, runValidation, quizCtrl.submitQuiz);

export default router;
