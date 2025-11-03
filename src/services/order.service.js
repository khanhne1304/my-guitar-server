import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';

export async function createOrderFromCartService(userId, shippingAddress, paymentMethod, providedItems) {
  // Nếu client cung cấp items hợp lệ, ưu tiên dùng chúng; nếu không thì dùng cart trên server
  let sourceItems = [];
  if (Array.isArray(providedItems) && providedItems.length > 0) {
    sourceItems = providedItems.map((it) => ({
      product: it.product,
      qty: Number(it.qty) || 0,
      name: it.name,
      price: typeof it.price === 'number' ? it.price : undefined,
    }));
  } else {
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) throw new Error('EMPTY_CART');
    sourceItems = cart.items.map((it) => ({ product: it.product, qty: it.qty }));
  }

  if (sourceItems.length === 0) throw new Error('EMPTY_CART');

  let total = 0;
  const itemsData = [];

  for (const it of sourceItems) {
    const p = await Product.findById(it.product);
    if (!p || !p.isActive) throw new Error('INVALID_PRODUCT');
    if (p.stock < it.qty) throw new Error(`OUT_OF_STOCK:${p.name}`);

    const unit = (() => {
      // Nếu client đã cung cấp price/name thì ưu tiên dùng giá trị FE gửi
      if (it.price && typeof it.price === 'number') return it.price;
      return p.price.sale ?? p.price.base;
    })();
    const name = it.name || p.name;

    total += unit * it.qty;
    itemsData.push({ product: p._id, name, price: unit, qty: it.qty });
  }

  const order = await Order.create({
    user: userId,
    items: itemsData,
    shippingAddress,
    paymentMethod: paymentMethod || 'cod',
    status: 'pending',
    total,
  });

  // Trừ tồn kho theo items đã đặt
  for (const it of sourceItems) {
    await Product.findByIdAndUpdate(it.product, { $inc: { stock: -it.qty } });
  }

  // Nếu lấy từ cart server thì clear cart; nếu dùng providedItems thì không động vào cart
  if (!Array.isArray(providedItems) || providedItems.length === 0) {
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
  }

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

export async function confirmReceivedService(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error('NOT_FOUND');
  if (order.status !== 'delivered') {
    throw new Error('INVALID_STATUS');
  }

  order.status = 'completed';
  await order.save();
  return order;
}

export async function cancelOrderService(userId, orderId, reason) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error('NOT_FOUND');
  // Chỉ cho phép hủy nếu chưa delivered/completed
  if (['delivered', 'completed'].includes(order.status)) throw new Error('INVALID_STATUS');

  order.status = 'cancelled';
  order.cancelReason = String(reason || '').slice(0, 500);
  order.cancelledAt = new Date();
  await order.save();
  return order;
}