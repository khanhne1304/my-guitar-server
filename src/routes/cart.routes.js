import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller.js';
import { validateAddToCart } from '../validators/cart.validator.js';

const router = Router();

router.use(protect);

router.get('/', getCart);
router.post('/items', validateAddToCart, addToCart);
router.patch('/items/:productId', updateCartItem);
router.delete('/items/:productId', removeCartItem);
router.delete('/', clearCart);

export default router;
