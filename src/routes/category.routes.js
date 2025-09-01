// src/routes/category.routes.js
import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js'; // đúng thư mục 'middlewares'
import {
  list,
  create,
  getBySlug,
  update,
  remove,
  validateCreate,
} from '../controllers/category.controller.js';

const router = Router();

router.get('/', list);
router.get('/:slug', getBySlug);

router.post('/', protect, admin, validateCreate, create);
router.patch('/:id', protect, admin, update);
router.delete('/:id', protect, admin, remove);

export default router; 