import { body } from 'express-validator';

export const validateCreateOrder = [
  body('shippingAddress.fullName').notEmpty(),
  body('shippingAddress.phone').notEmpty(),
  body('shippingAddress.address').notEmpty(),
  // city và district có thể trống trong trường hợp nhận tại cửa hàng
  body('shippingAddress.city').optional(),
  body('shippingAddress.district').optional(),
  // Cho phép client gửi items trực tiếp thay vì lấy từ cart trên server
  body('items').optional().isArray({ min: 1 }),
  body('items.*.product').optional().notEmpty(),
  body('items.*.qty').optional().isInt({ min: 1 }),
  body('shippingMode').optional().isIn(['delivery', 'pickup']),
  body('shipMethod').optional().isIn(['economy', 'standard', 'express']),
  body('paymentMethod').optional().isIn(['cod', 'vnpay']),
];
