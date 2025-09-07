import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import {
  validateProductCreate,
  validateProductUpdate,
} from '../validators/product.validator.js';

const router = Router();

// Public
router.get('/', listProducts);
router.get('/:slug', getProductBySlug);

// Admin
router.post('/', protect, admin, validateProductCreate, createProduct);
router.patch('/:id', protect, admin, validateProductUpdate, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;
