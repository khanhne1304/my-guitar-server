import { Router } from 'express';
import { validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import * as moduleCtrl from '../controllers/learning/module.controller.js';
import {
  validateCreateModule,
  validateUpdateModule,
  validateModuleId,
} from '../validators/learning.validator.js';

const router = Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0]?.msg || 'Dữ liệu không hợp lệ', issues: errors.array() });
  }
  next();
}

router.post('/', protect, validateCreateModule, runValidation, moduleCtrl.createModule);
router.put('/:id', protect, validateUpdateModule, runValidation, moduleCtrl.updateModule);
router.delete('/:id', protect, validateModuleId, runValidation, moduleCtrl.deleteModule);

export default router;
