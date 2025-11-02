import { validationResult } from 'express-validator';
import {
  listCoupons,
  listCouponsAdmin,
  createCoupon,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} from '../services/coupon.service.js';

export async function list(req, res, next) {
  try {
    res.json(await listCoupons());
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req, res, next) {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const result = await listCouponsAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const coupon = await createCoupon(req.body);
    res.status(201).json(coupon);
  } catch (e) {
    if (e.code === 11000)
      return res.status(409).json({ message: 'Mã coupon đã tồn tại' });
    next(e);
  }
}

export async function getByCode(req, res, next) {
  try {
    const coupon = await getCouponByCode(req.params.code);
    if (!coupon) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(coupon);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const coupon = await updateCoupon(req.params.id, req.body);
    if (!coupon) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(coupon);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const coupon = await deleteCoupon(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}

export async function apply(req, res, next) {
  try {
    const { code, orderTotal } = req.body;
    const result = await applyCoupon(code, orderTotal);
    res.json(result);
  } catch (e) {
    if (e.message === 'INVALID_COUPON')
      return res.status(400).json({ message: 'Mã không hợp lệ' });
    if (e.message === 'NOT_STARTED')
      return res.status(400).json({ message: 'Chưa đến ngày bắt đầu' });
    if (e.message === 'EXPIRED')
      return res.status(400).json({ message: 'Mã đã hết hạn' });
    if (e.message === 'USAGE_LIMIT_REACHED')
      return res.status(400).json({ message: 'Mã đã hết lượt sử dụng' });
    if (e.message === 'MIN_ORDER_NOT_MET')
      return res.status(400).json({ message: 'Chưa đạt giá trị đơn tối thiểu' });
    next(e);
  }
}
