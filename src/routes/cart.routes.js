import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateAddToCart,
} from '../controllers/cart.controller.js';

const router = Router();

router.use(protect);

router.get('/', getCart);
router.post('/items', validateAddToCart, addToCart);
router.patch('/items/:productId', updateCartItem);
router.delete('/items/:productId', removeCartItem);
router.delete('/', clearCart);

export default router;
