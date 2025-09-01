import { body, validationResult } from 'express-validator';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';

export const validateCreateOrder = [
  body('shippingAddress.fullName').notEmpty(),
  body('shippingAddress.phone').notEmpty(),
  body('shippingAddress.address').notEmpty(),
  body('shippingAddress.city').notEmpty(),
  body('shippingAddress.district').notEmpty(),
  body('paymentMethod').optional().isIn(['cod', 'vnpay', 'momo']),
];

// POST /api/orders (tạo đơn từ giỏ)
export async function createOrderFromCart(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'Giỏ hàng trống' });

    // kiểm tra tồn kho & tính tổng
    let total = 0;
    const itemsData = [];
    for (const it of cart.items) {
      const p = await Product.findById(it.product);
      if (!p || !p.isActive)
        return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
      if (p.stock < it.qty)
        return res.status(400).json({ message: `Thiếu hàng: ${p.name}` });
      const unit = p.price.sale ?? p.price.base;
      total += unit * it.qty;
      itemsData.push({
        product: p._id,
        name: p.name,
        price: unit,
        qty: it.qty,
      });
    }

    const order = await Order.create({
      user: req.user.id,
      items: itemsData,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod || 'cod',
      status: 'pending',
      total,
    });

    // trừ stock
    for (const it of cart.items) {
      await Product.findByIdAndUpdate(it.product, { $inc: { stock: -it.qty } });
    }

    // clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json(order);
  } catch (e) {
    next(e);
  }
}

// GET /api/orders/mine
export async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user.id }).sort('-createdAt');
    res.json(orders);
  } catch (e) {
    next(e);
  }
}

// POST /api/orders/:id/pay (mock thanh toán)
export async function payOrder(req, res, next) {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn' });
    if (order.status !== 'pending')
      return res
        .status(400)
        .json({ message: 'Đơn không ở trạng thái pending' });

    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();
    res.json({ message: 'Đã thanh toán', order });
  } catch (e) {
    next(e);
  }
}

// (Admin) GET /api/orders
export async function adminListOrders(req, res, next) {
  try {
    const orders = await Order.find()
      .populate('user', 'username email')
      .sort('-createdAt');
    res.json(orders);
  } catch (e) {
    next(e);
  }
}
