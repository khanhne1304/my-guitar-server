import { body } from 'express-validator';

export const validateCreateOrder = [
  body('shippingAddress.fullName').notEmpty(),
  body('shippingAddress.phone').notEmpty(),
  body('shippingAddress.address').notEmpty(),
  body('shippingAddress.city').notEmpty(),
  body('shippingAddress.district').notEmpty(),
  // Cho phép client gửi items trực tiếp thay vì lấy từ cart trên server
  body('items').optional().isArray({ min: 1 }),
  body('items.*.product').optional().notEmpty(),
  body('items.*.name').optional().isString(),
  body('items.*.price').optional().isNumeric(),
  body('items.*.qty').optional().isInt({ min: 1 }),
  body('total').optional().isNumeric(),
  body('paymentMethod').optional().isIn(['cod', 'vnpay', 'momo']),
];
