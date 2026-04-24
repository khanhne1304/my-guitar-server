import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import { applyCoupon } from './coupon.service.js';
import { executeWithTransaction } from '../utils/transactionHelper.js';

export async function createOrderFromCartService(userId, shippingAddress, paymentMethod, providedItems, couponCode = null) {
  return await executeWithTransaction(async (session) => {
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
      const cartQuery = Cart.findOne({ user: userId });
      if (session) cartQuery.session(session);
      const cart = await cartQuery;
      
      if (!cart || cart.items.length === 0) {
        throw new Error('EMPTY_CART');
      }
      sourceItems = cart.items.map((it) => ({ product: it.product, qty: it.qty }));
    }

    if (sourceItems.length === 0) {
      throw new Error('EMPTY_CART');
    }

    let subtotal = 0;
    const itemsData = [];
    const stockUpdates = [];

    // Kiểm tra và chuẩn bị dữ liệu
    for (const it of sourceItems) {
      const productQuery = Product.findById(it.product);
      if (session) productQuery.session(session);
      const p = await productQuery;
      
      if (!p || !p.isActive) {
        throw new Error('INVALID_PRODUCT');
      }
      
      // Kiểm tra stock với atomic operation
      if (p.stock < it.qty) {
        throw new Error(`OUT_OF_STOCK:${p.name}`);
      }

      const unit = (() => {
        // Nếu client đã cung cấp price/name thì ưu tiên dùng giá trị FE gửi
        if (it.price && typeof it.price === 'number') return it.price;
        return p.price.sale ?? p.price.base;
      })();
      const name = it.name || p.name;

      subtotal += unit * it.qty;
      itemsData.push({ product: p._id, name, price: unit, qty: it.qty });
      stockUpdates.push({ productId: p._id, qty: it.qty });
    }

    // Validate và apply coupon nếu có
    let discount = 0;
    let couponData = null;
    if (couponCode) {
      try {
        const couponResult = await applyCoupon(couponCode, subtotal, session);
        discount = couponResult.discount;
        couponData = {
          code: couponResult.couponCode,
          discount: discount,
          couponId: couponResult.coupon,
        };
      } catch (error) {
        throw error; // Re-throw coupon errors
      }
    }

    const total = Math.max(0, subtotal - discount);

    // Tạo đơn hàng
    const orderOptions = session ? { session } : {};
    const order = await Order.create([{
      user: userId,
      items: itemsData,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      status: 'pending',
      subtotal,
      total,
      coupon: couponData,
    }], orderOptions);

    // Trừ tồn kho với atomic operation
    // Sử dụng findOneAndUpdate với điều kiện để đảm bảo stock không âm
    for (const update of stockUpdates) {
      const updateOptions = { new: true };
      if (session) updateOptions.session = session;
      
      // Atomic update với điều kiện stock >= qty
      const result = await Product.findOneAndUpdate(
        {
          _id: update.productId,
          stock: { $gte: update.qty }, // Chỉ update nếu stock đủ
        },
        { $inc: { stock: -update.qty } },
        updateOptions
      );
      
      // Nếu không update được (stock không đủ), throw error
      if (!result) {
        const product = await Product.findById(update.productId);
        throw new Error(`OUT_OF_STOCK:${product?.name || 'Unknown'}`);
      }
      
      // Double check để đảm bảo stock không âm
      if (result.stock < 0) {
        throw new Error(`OUT_OF_STOCK:${result.name}`);
      }
    }

    // Nếu lấy từ cart server thì clear cart; nếu dùng providedItems thì không động vào cart
    if (!Array.isArray(providedItems) || providedItems.length === 0) {
      const cartQuery = Cart.findOne({ user: userId });
      if (session) cartQuery.session(session);
      const cart = await cartQuery;
      
      if (cart) {
        cart.items = [];
        if (session) {
          await cart.save({ session });
        } else {
          await cart.save();
        }
      }
    }

    return order[0];
  });
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
  return await executeWithTransaction(async (session) => {
    const orderQuery = Order.findOne({ _id: orderId, user: userId });
    if (session) orderQuery.session(session);
    const order = await orderQuery;
    
    if (!order) {
      throw new Error('NOT_FOUND');
    }
    
    // Chỉ cho phép hủy nếu chưa delivered/completed
    if (['delivered', 'completed'].includes(order.status)) {
      throw new Error('INVALID_STATUS');
    }

    // Chỉ restore stock nếu đơn hàng đã được tạo và chưa được giao
    // (pending hoặc paid nhưng chưa shipped)
    const shouldRestoreStock = ['pending', 'paid'].includes(order.status);

    order.status = 'cancelled';
    order.cancelReason = String(reason || '').slice(0, 500);
    order.cancelledAt = new Date();
    
    if (session) {
      await order.save({ session });
    } else {
      await order.save();
    }

    // Restore stock nếu cần
    if (shouldRestoreStock && order.items && order.items.length > 0) {
      for (const item of order.items) {
        const updateOptions = session ? { session } : {};
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.qty } },
          updateOptions
        );
      }
    }

    // Restore coupon usedCount nếu có coupon
    if (order.coupon && order.coupon.couponId) {
      const updateOptions = session ? { session } : {};
      await Coupon.findByIdAndUpdate(
        order.coupon.couponId,
        { $inc: { usedCount: -1 } },
        updateOptions
      );
    }

    return order;
  });
}