import Coupon from '../models/Coupon.js';

export async function listCoupons() {
  return await Coupon.find().sort('-createdAt');
}

export async function createCoupon(data) {
  return await Coupon.create(data);
}

export async function getCouponByCode(code) {
  return await Coupon.findOne({ code: code.toUpperCase() });
}

export async function updateCoupon(id, data) {
  return await Coupon.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteCoupon(id) {
  return await Coupon.findByIdAndDelete(id);
}

export async function applyCoupon(code, orderTotal) {
  const coupon = await getCouponByCode(code);
  if (!coupon || !coupon.isActive) throw new Error('INVALID_COUPON');

  const now = new Date();
  if (coupon.startAt && coupon.startAt > now) throw new Error('NOT_STARTED');
  if (coupon.endAt && coupon.endAt < now) throw new Error('EXPIRED');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit)
    throw new Error('USAGE_LIMIT_REACHED');
  if (coupon.minOrder > 0 && orderTotal < coupon.minOrder)
    throw new Error('MIN_ORDER_NOT_MET');

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = (orderTotal * coupon.amount) / 100;
    if (coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.amount;
  }

  return {
    discount,
    finalTotal: Math.max(0, orderTotal - discount),
    coupon,
  };
}
