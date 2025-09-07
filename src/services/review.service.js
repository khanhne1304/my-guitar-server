import Review from '../models/Review.js';
import Product from '../models/Product.js';

export async function listReviewsService(productId) {
  const filter = productId ? { product: productId } : {};
  return await Review.find(filter)
    .populate('user', 'username fullName')
    .populate('product', 'name slug');
}

export async function createReviewService(userId, { product, rating, comment }) {
  const exists = await Product.findById(product);
  if (!exists || !exists.isActive) throw new Error('INVALID_PRODUCT');

  try {
    const review = await Review.create({
      product,
      user: userId,
      rating,
      comment,
    });
    return await review.populate('user', 'username fullName');
  } catch (e) {
    if (e?.code === 11000) throw new Error('DUPLICATE_REVIEW');
    throw e;
  }
}

export async function updateMyReviewService(userId, reviewId, data) {
  const rev = await Review.findOne({ _id: reviewId, user: userId });
  if (!rev) throw new Error('NOT_FOUND');

  if (data.rating !== undefined) {
    const r = Number(data.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5)
      throw new Error('INVALID_RATING');
    rev.rating = r;
  }
  if (data.comment !== undefined) rev.comment = data.comment;

  await rev.save();
  return rev;
}

export async function deleteReviewService(user, reviewId) {
  const filter =
    user.role === 'admin'
      ? { _id: reviewId }
      : { _id: reviewId, user: user.id };

  const rev = await Review.findOne(filter);
  if (!rev) throw new Error('NOT_FOUND');
  await rev.remove();
  return rev;
}
