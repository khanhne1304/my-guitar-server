import Coupon from '../models/Coupon.js';
import mongoose from 'mongoose';

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

// Validate coupon (không tăng usedCount) - dùng cho preview
export async function validateCoupon(code, orderTotal) {
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
    // Fixed type: không được vượt quá orderTotal
    discount = Math.min(coupon.amount, orderTotal);
  }

  return {
    discount,
    finalTotal: Math.max(0, orderTotal - discount),
    coupon,
  };
}

// Apply coupon và tăng usedCount (dùng khi tạo order)
export async function applyCoupon(code, orderTotal, session = null) {
  const coupon = await getCouponByCode(code);
  if (!coupon || !coupon.isActive) throw new Error('INVALID_COUPON');

  const now = new Date();
  if (coupon.startAt && coupon.startAt > now) throw new Error('NOT_STARTED');
  if (coupon.endAt && coupon.endAt < now) throw new Error('EXPIRED');
  if (coupon.minOrder > 0 && orderTotal < coupon.minOrder)
    throw new Error('MIN_ORDER_NOT_MET');

  // Kiểm tra và tăng usedCount với atomic operation
  if (coupon.usageLimit > 0) {
    // Sử dụng findOneAndUpdate để đảm bảo atomicity
    const updated = await Coupon.findOneAndUpdate(
      {
        _id: coupon._id,
        usedCount: { $lt: coupon.usageLimit }, // Chỉ update nếu chưa đạt limit
      },
      { $inc: { usedCount: 1 } },
      { new: true, session }
    );

    if (!updated) {
      throw new Error('USAGE_LIMIT_REACHED');
    }
  } else {
    // Không giới hạn, chỉ tăng usedCount
    await Coupon.findByIdAndUpdate(
      coupon._id,
      { $inc: { usedCount: 1 } },
      { session }
    );
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = (orderTotal * coupon.amount) / 100;
    if (coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    // Fixed type: không được vượt quá orderTotal
    discount = Math.min(coupon.amount, orderTotal);
  }

  return {
    discount,
    finalTotal: Math.max(0, orderTotal - discount),
    coupon: coupon._id,
    couponCode: coupon.code,
  };
}

// Alias cho backward compatibility (dùng validateCoupon)
export async function applyCouponForPreview(code, orderTotal) {
  return await validateCoupon(code, orderTotal);
}
