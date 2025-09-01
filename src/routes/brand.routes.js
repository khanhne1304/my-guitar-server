import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  list,
  create,
  getBySlug,
  update,
  remove,
  validateCreate,
} from '../controllers/brand.controller.js';

const router = Router();

router.get('/', list);
router.get('/:slug', getBySlug);

router.post('/', protect, admin, validateCreate, create);
router.patch('/:id', protect, admin, update);
router.delete('/:id', protect, admin, remove);

export default router;
