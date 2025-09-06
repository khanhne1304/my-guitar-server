import { body, validationResult } from 'express-validator';
import Coupon from '../models/Coupon.js';

export const validateCreate = [
  body('code').notEmpty().withMessage('code required'),
  body('type').isIn(['percent', 'fixed']).withMessage('type invalid'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount > 0'),
  body('maxDiscount').optional().isFloat({ min: 0 }),
  body('minOrder').optional().isFloat({ min: 0 }),
  body('startAt').optional().isISO8601(),
  body('endAt').optional().isISO8601(),
];

export async function list(req, res, next) {
  try {
    const items = await Coupon.find().sort('-createdAt');
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    // chuẩn hoá code
    if (req.body.code)
      req.body.code = String(req.body.code).toUpperCase().trim();

    const created = await Coupon.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === 11000)
      return res.status(409).json({ message: 'Mã giảm giá đã tồn tại' });
    next(e);
  }
}

export async function getByCode(req, res, next) {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const c = await Coupon.findOne({ code });
    if (!c) return res.status(404).json({ message: 'Không tìm thấy coupon' });
    res.json(c);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    if (req.body.code)
      req.body.code = String(req.body.code).toUpperCase().trim();
    const c = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(c);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const c = await Coupon.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}

/** POST /api/coupons/apply
 * body: { code, total? }
 * Trả về:
 *  - Không có total: { valid, coupon {...} }
 *  - Có total: { valid, coupon {...}, discount, payable }
 */
export async function apply(req, res, next) {
  try {
    const { code } = req.body;
    const hasTotal = Object.prototype.hasOwnProperty.call(req.body, 'total');
    const total = hasTotal ? Number(req.body.total) : undefined;

    if (!code) {
      return res.status(400).json({ message: 'code là bắt buộc' });
    }
    if (hasTotal && (!Number.isFinite(total) || total <= 0)) {
      return res
        .status(400)
        .json({ message: 'total phải là số dương nếu được cung cấp' });
    }

    const c = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
    if (!c) return res.json({ valid: false, reason: 'Mã không tồn tại' });
    if (!c.isActive) return res.json({ valid: false, reason: 'Mã đã tắt' });

    const now = new Date();
    if (c.startAt && now < c.startAt)
      return res.json({ valid: false, reason: 'Chưa đến thời gian áp dụng' });
    if (c.endAt && now > c.endAt)
      return res.json({ valid: false, reason: 'Mã đã hết hạn' });

    // Thông tin cơ bản của coupon
    const baseResponse = {
      valid: true,
      coupon: {
        type: c.type,
        amount: c.amount,
        maxDiscount: c.maxDiscount ?? null,
        minOrder: c.minOrder ?? null,
        startAt: c.startAt ?? null,
        endAt: c.endAt ?? null,
        usageLimit: c.usageLimit ?? null,
        usedCount: c.usedCount ?? 0,
      },
    };

    // Nếu không truyền total -> trả về thông tin coupon
    if (!hasTotal) {
      return res.json(baseResponse);
    }

    // Có total thì áp dụng các điều kiện liên quan đơn hàng
    if (c.minOrder && total < c.minOrder)
      return res.json({ valid: false, reason: `Đơn tối thiểu ${c.minOrder}` });
    if (c.usageLimit && c.usedCount >= c.usageLimit)
      return res.json({ valid: false, reason: 'Đã hết lượt dùng' });

    let discount = 0;
    if (c.type === 'percent') {
      discount = Math.floor((total * c.amount) / 100);
      if (c.maxDiscount && discount > c.maxDiscount) discount = c.maxDiscount;
    } else {
      discount = Math.floor(c.amount);
    }
    if (discount > total) discount = total;

    return res.json({ ...baseResponse, discount, payable: total - discount });
  } catch (e) {
    next(e);
  }
}
