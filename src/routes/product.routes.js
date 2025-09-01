import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  validateProductCreate,
  validateProductUpdate,
} from '../controllers/product.controller.js';

const router = Router();

router.get('/', listProducts);
router.get('/:slug', getProductBySlug);

router.post('/', protect, admin, validateProductCreate, createProduct);
router.patch('/:id', protect, admin, validateProductUpdate, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;
