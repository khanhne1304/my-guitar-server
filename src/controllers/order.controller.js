import { validationResult } from 'express-validator';
import Order from '../models/Order.js';
import {
  createOrderFromCartService,
  getUserOrders,
  payOrderService,
  adminListOrdersService,
  confirmReceivedService,
  cancelOrderService,
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
    const allowedStatuses = ['pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // Ràng buộc admin theo logic thực tế:
    
    // - Không thể cancel nếu đơn đã được giao (delivered, completed)
    if (status === 'cancelled') {
      if (['delivered', 'completed'].includes(order.status)) {
        return res.status(400).json({ message: 'Không thể hủy đơn đã được giao' });
      }
      // Cho phép cancel nếu đã shipped (trường hợp không giao được) nhưng cảnh báo
      if (order.status === 'shipped') {
        // Có thể cho phép nhưng nên có xác nhận ở frontend
      }
    }

    // - Trạng thái completed KHÔNG được admin chuyển trực tiếp từ delivered
    // - Chỉ có thể chuyển sang completed thông qua endpoint confirmReceived (user xác nhận đã nhận hàng)
    if (status === 'completed') {
      return res.status(400).json({ 
        message: 'Không thể chuyển trạng thái sang hoàn tất. Chỉ người dùng mới có thể xác nhận đã nhận hàng để hoàn tất đơn hàng.' 
      });
    }

    // Logic chuyển trạng thái theo quy trình thực tế (admin):
    // pending -> paid (đã thanh toán online) hoặc shipped (COD hoặc giao trước)
    // paid -> shipped (đã thanh toán, chuẩn bị giao)
    // shipped -> delivered (đã giao đến khách)
    // delivered -> paid (COD: thanh toán sau khi giao)
    // completed: chỉ có thể đạt được thông qua user xác nhận đã nhận hàng
    // cancelled: có thể hủy nếu chưa delivered
    
    const current = order.status;
    const allowedTransitions = {
      pending: new Set(['paid', 'shipped', 'cancelled']),
      paid: new Set(['shipped', 'cancelled']), // Có thể cancel nếu chưa shipped
      shipped: new Set(['delivered', 'cancelled']), // Có thể cancel nếu không giao được
      delivered: new Set(['paid']), // COD: chỉ có thể chuyển sang paid, KHÔNG thể sang completed (chỉ user mới có thể)
      completed: new Set([]), // Trạng thái cuối cùng, không thể chuyển
      cancelled: new Set([]), // Trạng thái cuối cùng, không thể chuyển
    };
    
    if (!allowedTransitions[current].has(status)) {
      return res.status(400).json({ 
        message: `Không thể chuyển từ "${current}" sang "${status}". Các trạng thái hợp lệ: ${Array.from(allowedTransitions[current]).join(', ')}` 
      });
    }

    // Tự động ghi thời điểm thanh toán khi chuyển sang paid
    if (status === 'paid' && !order.paidAt) {
      order.paidAt = new Date();
    }

    order.status = status;
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

export async function confirmReceived(req, res, next) {
  try {
    const order = await confirmReceivedService(req.user.id, req.params.id);
    res.json({ message: 'Đã xác nhận nhận hàng', order });
  } catch (e) {
    if (e.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (e.message === 'INVALID_STATUS')
      return res.status(400).json({ message: 'Chỉ có thể xác nhận đơn hàng ở trạng thái đã giao' });
    next(e);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const { reason } = req.body;
    const order = await cancelOrderService(req.user.id, req.params.id, reason);
    res.json({ message: 'Đã hủy đơn hàng', order });
  } catch (e) {
    if (e.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (e.message === 'INVALID_STATUS')
      return res.status(400).json({ message: 'Không thể hủy đơn đã giao/hoàn tất' });
    next(e);
  }
}
