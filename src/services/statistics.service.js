import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Review from '../models/Review.js';

export async function getStatisticsService() {
  try {
    // Tổng số đơn hàng
    const totalOrders = await Order.countDocuments();

    // Tổng doanh thu (chỉ tính đơn đã hoàn thành)
    const completedOrders = await Order.find({ status: 'completed' });
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Doanh thu trong tháng này
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthOrders = await Order.find({
      status: 'completed',
      createdAt: { $gte: startOfMonth }
    });
    const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Doanh thu tháng trước
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    const endOfLastMonth = new Date(startOfMonth);
    
    const lastMonthOrders = await Order.find({
      status: 'completed',
      createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth }
    });
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Tổng số người dùng
    const totalUsers = await User.countDocuments();
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Tổng số sản phẩm
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });

    // Đơn hàng theo trạng thái
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Tổng số đơn hàng theo trạng thái
    const statusCounts = {
      pending: 0,
      paid: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0
    };

    ordersByStatus.forEach(item => {
      if (statusCounts.hasOwnProperty(item._id)) {
        statusCounts[item._id] = item.count;
      }
    });

    // Top 10 sản phẩm bán chạy
    const topProductsAgg = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.qty' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Populate thông tin sản phẩm
    const productIds = topProductsAgg
      .map(item => item._id)
      .filter(id => id != null);
    
    const products = await Product.find({ _id: { $in: productIds } })
      .select('name slug images price')
      .lean();

    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    
    const topProductsWithDetails = topProductsAgg
      .filter(item => item._id != null && productMap.has(item._id.toString()))
      .map(item => ({
        id: item._id.toString(),
        name: productMap.get(item._id.toString())?.name || 'N/A',
        slug: productMap.get(item._id.toString())?.slug || '',
        images: productMap.get(item._id.toString())?.images || [],
        price: productMap.get(item._id.toString())?.price || {},
        totalSold: item.totalSold,
        totalRevenue: item.totalRevenue
      }));

    // Doanh thu theo tháng (12 tháng gần nhất)
    const revenueByMonth = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 11))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Doanh thu theo tuần (8 tuần gần nhất)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const revenueByWeek = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: eightWeeksAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    // Tổng số đánh giá
    const totalReviews = await Review.countDocuments();
    const averageRating = await Review.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    // Đơn hàng gần đây (7 ngày)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentOrders = await Order.find({
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate('user', 'username email fullName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      overview: {
        totalOrders,
        totalRevenue,
        monthRevenue,
        lastMonthRevenue,
        revenueGrowth: lastMonthRevenue > 0 
          ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(2)
          : 0,
        totalUsers,
        newUsersThisMonth,
        totalProducts,
        activeProducts,
        totalReviews,
        averageRating: averageRating[0]?.avgRating || 0
      },
      ordersByStatus: statusCounts,
      topProducts: topProductsWithDetails,
      revenueByMonth: revenueByMonth.map(item => ({
        month: `${item._id.month}/${item._id.year}`,
        revenue: item.revenue,
        orders: item.orders
      })),
      revenueByWeek: revenueByWeek.map(item => ({
        week: `Tuần ${item._id.week}/${item._id.year}`,
        revenue: item.revenue,
        orders: item.orders
      })),
      recentOrders
    };
  } catch (error) {
    console.error('Error in getStatisticsService:', error);
    throw error;
  }
}

