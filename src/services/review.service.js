import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

export async function listReviewsService(productId) {
  const filter = productId ? { product: productId } : {};
  return await Review.find(filter)
    .populate('user', 'username fullName email')
    .populate('product', 'name slug');
}

export async function listReviewsAdmin({ page = 1, limit = 10, search, rating }) {
  const skip = (page - 1) * limit;
  
  // Xây dựng query
  const query = {};
  
  // Tìm kiếm theo comment
  if (search) {
    query.comment = { $regex: search, $options: 'i' };
  }
  
  // Lọc theo rating
  if (rating) {
    query.rating = parseInt(rating);
  }
  
  // Đếm tổng số reviews
  const total = await Review.countDocuments(query);
  
  // Lấy danh sách reviews
  const reviews = await Review.find(query)
    .populate('user', 'username fullName email')
    .populate('product', 'name slug')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    reviews,
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

// Lấy danh sách sản phẩm từ các đơn hàng đã hoàn thành mà user có thể đánh giá
export async function getReviewableProductsService(userId) {
  // Lấy tất cả các đơn hàng đã hoàn thành của user
  const completedOrders = await Order.find({
    user: userId,
    status: 'completed',
  }).populate({
    path: 'items.product',
    select: 'name slug images price isActive',
  });

  // Lấy danh sách các sản phẩm đã được đánh giá bởi user
  const reviewedProducts = await Review.find({ user: userId }).select('product');
  const reviewedProductIds = reviewedProducts.map((r) => r.product.toString());

  // Tạo map để tránh trùng lặp và theo dõi số lượng
  const productMap = new Map();

  completedOrders.forEach((order) => {
    order.items.forEach((item) => {
      // Kiểm tra product có tồn tại và đang active không
      if (!item.product || !item.product.isActive) return;

      const productId = item.product._id.toString();
      // Chỉ thêm sản phẩm chưa được đánh giá
      if (!reviewedProductIds.includes(productId)) {
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product: item.product,
            qty: item.qty,
            orderedAt: order.createdAt,
            orderId: order._id,
          });
        }
      }
    });
  });

  // Chuyển đổi map thành mảng và sắp xếp theo ngày đặt hàng (mới nhất trước)
  const reviewableProducts = Array.from(productMap.values()).sort(
    (a, b) => new Date(b.orderedAt) - new Date(a.orderedAt)
  );

  return reviewableProducts;
}

export async function createReviewService(userId, { product, rating, comment }) {
  const exists = await Product.findById(product);
  if (!exists || !exists.isActive) throw new Error('INVALID_PRODUCT');

  // Kiểm tra xem user đã mua sản phẩm này trong một đơn hàng đã hoàn thành chưa
  const completedOrder = await Order.findOne({
    user: userId,
    status: 'completed',
    'items.product': product,
  });

  if (!completedOrder) {
    throw new Error('ORDER_NOT_COMPLETED');
  }

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

  // Sử dụng findOneAndDelete để hook có thể truy cập document
  const rev = await Review.findOneAndDelete(filter);
  if (!rev) throw new Error('NOT_FOUND');
  
  // Hook sẽ tự động gọi recalcProductRating, nhưng đảm bảo bằng cách gọi thủ công
  await Review.recalcProductRating(rev.product);
  return rev;
}
