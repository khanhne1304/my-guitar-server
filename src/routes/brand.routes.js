import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  list,
  create,
  getBySlug,
  update,
  remove,
  listByCategorySlug, // ✅ controller mới
} from '../controllers/brand.controller.js';
import { validateCreate } from '../validators/brand.validator.js';

const router = Router();

// Lấy brand theo category slug
router.get('/category/:slug', listByCategorySlug);

router.get('/', list);
router.get('/:slug', getBySlug);

router.post('/', protect, admin, validateCreate, create);
router.patch('/:id', protect, admin, update);
router.delete('/:id', protect, admin, remove);

export default router;
