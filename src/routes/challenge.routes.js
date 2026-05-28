import { Router } from 'express';
import { validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import * as challengeCtrl from '../controllers/learning/challenge.controller.js';
import { validateChallengeSong, validateModuleIdParam } from '../validators/learning.validator.js';

const router = Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ', issues: errors.array() });
  }
  next();
}

router.put('/', protect, validateChallengeSong, runValidation, challengeCtrl.upsertChallenge);
router.delete('/:moduleId', protect, validateModuleIdParam, runValidation, challengeCtrl.deleteChallenge);

export default router;
