import { body } from 'express-validator';

export const validateCreateOrder = [
  body('shippingAddress.fullName').notEmpty(),
  body('shippingAddress.phone').notEmpty(),
  body('shippingAddress.address').notEmpty(),
  body('shippingAddress.city').notEmpty(),
  body('shippingAddress.district').notEmpty(),
  body('paymentMethod').optional().isIn(['cod', 'vnpay', 'momo']),
];
