import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  list,
  create,
  getByCode,
  update,
  remove,
  apply,
} from '../controllers/coupon.controller.js';
import { validateCreate } from '../validators/coupon.validator.js';

const router = Router();

// Public
router.post('/apply', apply);

// Admin
router.get('/', protect, admin, list);
router.post('/', protect, admin, validateCreate, create);
router.get('/:code', protect, admin, getByCode);
router.patch('/:id', protect, admin, update);
router.delete('/:id', protect, admin, remove);

export default router;
