import { body, validationResult } from 'express-validator';
import Review from '../models/Review.js';
import Product from '../models/Product.js';

export const validateCreate = [
  body('product').notEmpty().withMessage('product required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating 1..5'),
  body('comment').optional().isString(),
];

export async function listReviews(req, res, next) {
  try {
    const { product } = req.query; // /api/reviews?product=<id>
    const q = product ? { product } : {};
    const items = await Review.find(q)
      .populate('user', 'username fullName')
      .populate('product', 'name slug');
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function createReview(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { product, rating, comment } = req.body;
    const exists = await Product.findById(product);
    if (!exists || !exists.isActive)
      return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });

    const doc = await Review.create({
      product,
      user: req.user.id,
      rating,
      comment,
    });
    res.status(201).json(await doc.populate('user', 'username fullName'));
  } catch (e) {
    // duplicate key -> đã review rồi
    if (e?.code === 11000)
      return res.status(409).json({ message: 'Bạn đã đánh giá sản phẩm này' });
    next(e);
  }
}

export async function updateMyReview(req, res, next) {
  try {
    const { rating, comment } = req.body;
    const rev = await Review.findOne({ _id: req.params.id, user: req.user.id });
    if (!rev)
      return res.status(404).json({ message: 'Không tìm thấy review của bạn' });
    if (rating !== undefined) {
      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 5)
        return res.status(400).json({ message: 'rating 1..5' });
      rev.rating = r;
    }
    if (comment !== undefined) rev.comment = comment;
    await rev.save();
    res.json(rev);
  } catch (e) {
    next(e);
  }
}

export async function deleteReview(req, res, next) {
  try {
    // owner hoặc admin mới được xoá (admin check ở middleware)
    const filter =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user.id };

    const rev = await Review.findOne(filter);
    if (!rev) return res.status(404).json({ message: 'Không tìm thấy review' });
    await rev.remove();
    res.json({ message: 'Đã xoá' });
  } catch (e) {
    next(e);
  }
}
