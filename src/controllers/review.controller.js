import { validationResult } from 'express-validator';
import {
  listReviewsService,
  listReviewsAdmin,
  createReviewService,
  updateMyReviewService,
  deleteReviewService,
  getReviewableProductsService,
} from '../services/review.service.js';

export async function listReviews(req, res, next) {
  try {
    const items = await listReviewsService(req.query.product);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req, res, next) {
  try {
    const { page = 1, limit = 10, search, rating } = req.query;
    const result = await listReviewsAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      rating
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getReviewableProducts(req, res, next) {
  try {
    const products = await getReviewableProductsService(req.user.id);
    res.json(products);
  } catch (e) {
    next(e);
  }
}

export async function createReview(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const review = await createReviewService(req.user.id, req.body);
    res.status(201).json(review);
  } catch (e) {
    if (e.message === 'INVALID_PRODUCT')
      return res.status(400).json({ message: 'Sản phẩm không hợp lệ' });
    if (e.message === 'ORDER_NOT_COMPLETED')
      return res.status(403).json({ message: 'Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã hoàn thành' });
    if (e.message === 'DUPLICATE_REVIEW')
      return res.status(409).json({ message: 'Bạn đã đánh giá sản phẩm này' });
    next(e);
  }
}

export async function updateMyReview(req, res, next) {
  try {
    const updated = await updateMyReviewService(
      req.user.id,
      req.params.id,
      req.body
    );
    res.json(updated);
  } catch (e) {
    if (e.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Không tìm thấy review của bạn' });
    if (e.message === 'INVALID_RATING')
      return res.status(400).json({ message: 'rating 1..5' });
    next(e);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const deleted = await deleteReviewService(req.user, req.params.id);
    res.json({ message: 'Đã xoá', review: deleted });
  } catch (e) {
    if (e.message === 'NOT_FOUND')
      return res.status(404).json({ message: 'Không tìm thấy review' });
    next(e);
  }
}
