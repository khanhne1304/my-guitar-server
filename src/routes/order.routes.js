import { Router } from 'express';
import { protect, admin } from '../middlewares/auth.js';
import {
  createOrderFromCart,
  myOrders,
  adminListOrders,
  payOrder,
  updateOrderStatus,
  confirmReceived,
  cancelOrder,
} from '../controllers/order.controller.js';
import { validateCreateOrder } from '../validators/order.validator.js';

const router = Router();

router.post('/', protect, validateCreateOrder, createOrderFromCart);
router.post('/checkout', protect, validateCreateOrder, createOrderFromCart);
router.get('/mine', protect, myOrders);
router.get('/', protect, admin, adminListOrders);
router.post('/:id/pay', protect, payOrder);
router.post('/:id/confirm-received', protect, confirmReceived);
router.post('/:id/cancel', protect, cancelOrder);
router.put('/:id', protect, admin, updateOrderStatus);

export default router;
