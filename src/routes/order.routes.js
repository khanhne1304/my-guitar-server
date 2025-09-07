import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  createOrderFromCart,
  myOrders,
  adminListOrders,
  payOrder,
} from '../controllers/order.controller.js';
import { validateCreateOrder } from '../validators/order.validator.js';

const router = Router();

router.post('/', protect, validateCreateOrder, createOrderFromCart);
router.get('/mine', protect, myOrders);
router.get('/', protect, admin, adminListOrders);
router.post('/:id/pay', protect, payOrder);

export default router;
