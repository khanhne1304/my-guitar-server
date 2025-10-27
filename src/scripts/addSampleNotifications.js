import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../models/Notification.js';

dotenv.config();

const addSampleNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const sampleNotifications = [
      {
        title: 'Chào mừng bạn đến với My Guitar!',
        content: 'Cảm ơn bạn đã đăng ký tài khoản. Hãy khám phá các sản phẩm guitar và piano chất lượng cao của chúng tôi.',
        type: 'general',
        priority: 'medium',
        targetAudience: 'all',
        isActive: true,
        scheduledAt: new Date(),
        actionUrl: '/products',
        actionText: 'Xem sản phẩm'
      },
      {
        title: '🎉 Khuyến mãi đặc biệt - Giảm 20% tất cả guitar!',
        content: 'Nhân dịp khai trương, chúng tôi dành tặng bạn ưu đãi giảm 20% cho tất cả sản phẩm guitar. Áp dụng từ hôm nay đến hết tháng.',
        type: 'promotion',
        priority: 'high',
        targetAudience: 'all',
        isActive: true,
        scheduledAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
        actionUrl: '/products?category=guitar',
        actionText: 'Mua ngay'
      },
      {
        title: '📦 Đơn hàng của bạn đã được giao thành công!',
        content: 'Đơn hàng #12345 đã được giao đến địa chỉ của bạn. Cảm ơn bạn đã tin tưởng và ủng hộ My Guitar!',
        type: 'order',
        priority: 'medium',
        targetAudience: 'registered',
        isActive: true,
        scheduledAt: new Date(),
        actionUrl: '/checkout-history',
        actionText: 'Xem lịch sử đơn hàng'
      },
      {
        title: '🛍️ Sản phẩm mới: Fender Stratocaster Professional',
        content: 'Chúng tôi vừa nhập về dòng guitar Fender Stratocaster Professional với âm thanh tuyệt vời. Hãy đến showroom để trải nghiệm!',
        type: 'product',
        priority: 'medium',
        targetAudience: 'all',
        isActive: true,
        scheduledAt: new Date(),
        actionUrl: '/products',
        actionText: 'Xem sản phẩm'
      },
      {
        title: '⚙️ Cập nhật hệ thống - Thời gian bảo trì',
        content: 'Hệ thống sẽ được bảo trì từ 2:00 - 4:00 sáng ngày mai để cải thiện hiệu suất. Xin lỗi vì sự bất tiện này.',
        type: 'system',
        priority: 'urgent',
        targetAudience: 'all',
        isActive: true,
        scheduledAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 giờ
      },
      {
        title: '🎵 Bài hát mới: "Hotel California" - Eagles',
        content: 'Chúng tôi đã thêm bài hát "Hotel California" của Eagles vào thư viện. Hãy thử luyện tập với hợp âm này!',
        type: 'general',
        priority: 'low',
        targetAudience: 'all',
        isActive: true,
        scheduledAt: new Date(),
        actionUrl: '/songs',
        actionText: 'Xem bài hát'
      }
    ];

    // Xóa thông báo cũ nếu có
    await Notification.deleteMany({});
    console.log('Cleared existing notifications');

    // Thêm thông báo mẫu
    const notifications = await Notification.insertMany(sampleNotifications);
    console.log(`Added ${notifications.length} sample notifications`);

    console.log('Sample notifications added successfully!');
  } catch (error) {
    console.error('Error adding sample notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

addSampleNotifications();
