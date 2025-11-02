import Coupon from '../models/Coupon.js';

export async function listCoupons() {
  return await Coupon.find().sort('-createdAt');
}

export async function listCouponsAdmin({ page = 1, limit = 10, search, status }) {
  const skip = (page - 1) * limit;
  
  // Xây dựng query
  const query = {};
  
  // Tìm kiếm theo code
  if (search) {
    query.code = { $regex: search, $options: 'i' };
  }
  
  // Lọc theo status
  if (status) {
    const now = new Date();
    if (status === 'active') {
      query.isActive = true;
      query.$and = [
        {
          $or: [
            { startAt: { $exists: false } },
            { startAt: null },
            { startAt: { $lte: now } }
          ]
        },
        {
          $or: [
            { endAt: { $exists: false } },
            { endAt: null },
            { endAt: { $gte: now } }
          ]
        }
      ];
    } else if (status === 'expired') {
      query.endAt = { $lt: now };
    } else if (status === 'inactive') {
      query.isActive = false;
    }
  }
  
  // Đếm tổng số coupons
  const total = await Coupon.countDocuments(query);
  
  // Lấy danh sách coupons
  const coupons = await Coupon.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    coupons,
    pagination: {
      currentPage: page,
      totalPages,
      total,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
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
