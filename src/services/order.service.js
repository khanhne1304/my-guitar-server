import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';

export async function createOrderFromCartService(userId, shippingAddress, paymentMethod) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) throw new Error('EMPTY_CART');

  let total = 0;
  const itemsData = [];

  for (const it of cart.items) {
    const p = await Product.findById(it.product);
    if (!p || !p.isActive) throw new Error('INVALID_PRODUCT');
    if (p.stock < it.qty) throw new Error(`OUT_OF_STOCK:${p.name}`);

    const unit = p.price.sale ?? p.price.base;
    total += unit * it.qty;
    itemsData.push({ product: p._id, name: p.name, price: unit, qty: it.qty });
  }

  const order = await Order.create({
    user: userId,
    items: itemsData,
    shippingAddress,
    paymentMethod: paymentMethod || 'cod',
    status: 'pending',
    total,
  });

  for (const it of cart.items) {
    await Product.findByIdAndUpdate(it.product, { $inc: { stock: -it.qty } });
  }

  cart.items = [];
  await cart.save();

  return order;
}

export async function getUserOrders(userId) {
  return await Order.find({ user: userId }).sort('-createdAt');
}

export async function payOrderService(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error('NOT_FOUND');
  if (order.status !== 'pending') throw new Error('INVALID_STATUS');

  order.status = 'paid';
  order.paidAt = new Date();
  await order.save();
  return order;
}

export async function adminListOrdersService() {
  return await Order.find().populate('user', 'username email').sort('-createdAt');
}
