import { validationResult } from 'express-validator';
import Order from '../models/Order.js';
import {
  createOrderFromCartService,
  getUserOrders,
  payOrderService,
  adminListOrdersService,
} from '../services/order.service.js';

export async function createOrderFromCart(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const order = await createOrderFromCartService(
      req.user.id,
      req.body.shippingAddress,
      req.body.paymentMethod,
      req.body.items
    );

    res.status(201).json(order);
  } catch (e) {
    if (e.message === 'EMPTY_CART')
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    if (e.message === 'INVALID_PRODUCT')
      return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
    if (e.message.startsWith('OUT_OF_STOCK'))
      return res.status(400).json({ message: `Thiếu hàng: ${e.message.split(':')[1]}` });
    next(e);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // Chỉ cập nhật nếu status hợp lệ
    const allowedStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    order.status = status;
    if (status === 'paid' && !order.paidAt) {
      order.paidAt = new Date(); // tự động ghi thời điểm thanh toán
    }
    await order.save();

    res.json({ message: 'Đã cập nhật trạng thái', order });
  } catch (e) {
    next(e);
  }
}
export async function myOrders(req, res, next) {
  try {
    const orders = await getUserOrders(req.user.id);
    res.json(orders);
  } catch (e) {
    next(e);
  }
}

export async function payOrder(req, res, next) {
  try {
    const order = await payOrderService(req.user.id, req.params.id);
    res.json({ message: 'Đã thanh toán', order });
  } catch (e) {
    if (e.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Không tìm thấy đơn' });
    if (e.message === 'INVALID_STATUS')
      return res.status(400).json({ message: 'Đơn không ở trạng thái pending' });
    next(e);
  }
}

export async function adminListOrders(req, res, next) {
  try {
    const orders = await adminListOrdersService();
    res.json(orders);
  } catch (e) {
    next(e);
  }
}
