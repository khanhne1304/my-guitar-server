import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  listByCategory,
  listByCategoryAndBrand,
} from '../controllers/product.controller.js';
import {
  validateProductCreate,
  validateProductUpdate,
} from '../validators/product.validator.js';

const router = Router();

// Public
router.get('/', listProducts);
router.get('/:slug', getProductBySlug);

// Theo category
router.get('/category/:slug', listByCategory);

// Theo category + brand
router.get('/category/:categorySlug/brand/:brandSlug', listByCategoryAndBrand);

// Admin
router.post('/', protect, admin, validateProductCreate, createProduct);
router.patch('/:id', protect, admin, validateProductUpdate, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;
