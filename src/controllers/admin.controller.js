import User from '../models/User.js';
import Review from '../models/Review.js';
import Coupon from '../models/Coupon.js';
import Notification from '../models/Notification.js';
import Product from '../models/Product.js';
import bcrypt from 'bcrypt';

// Lấy danh sách tất cả users (có phân trang)
export async function getAllUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const skip = (page - 1) * limit;

    // Tạo filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

// Lấy thông tin chi tiết một user
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

// Tạo user mới
export async function createUser(req, res, next) {
  try {
    const { username, email, password, fullName, address, phone, role } = req.body;

    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email đã tồn tại' : 'Username đã tồn tại' 
      });
    }

    const user = new User({
      username,
      email,
      password,
      fullName,
      address,
      phone,
      role: role || 'user'
    });

    await user.save();
    
    // Trả về user không có password
    const userResponse = await User.findById(user._id).select('-password');
    res.status(201).json(userResponse);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    next(error);
  }
}

// Cập nhật thông tin user
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { username, email, fullName, address, phone, role } = req.body;

    // Kiểm tra user tồn tại
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Kiểm tra email/username trùng lặp với user khác
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username đã tồn tại' });
      }
    }

    // Cập nhật thông tin
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    next(error);
  }
}

// Đổi mật khẩu user - CHỈ cho phép đổi mật khẩu chính mình
export async function changeUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Chỉ cho phép admin đổi mật khẩu chính mình
    if (id !== req.user.id) {
      return res.status(403).json({ 
        message: 'Bạn chỉ có thể đổi mật khẩu của chính mình' 
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    next(error);
  }
}

// Xóa user
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    // Không cho phép xóa chính mình
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Không thể xóa chính mình' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Xóa user thành công' });
  } catch (error) {
    next(error);
  }
}

// Thống kê users
export async function getUserStats(req, res, next) {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalRegularUsers = await User.countDocuments({ role: 'user' });
    
    // Users được tạo trong 30 ngày qua
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      totalUsers,
      totalAdmins,
      totalRegularUsers,
      newUsersLast30Days
    });
  } catch (error) {
    next(error);
  }
}

// ==================== REVIEW MANAGEMENT ====================

// Lấy danh sách tất cả reviews (có phân trang)
export async function getAllReviews(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const rating = req.query.rating || '';

    const skip = (page - 1) * limit;

    // Tạo filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { comment: { $regex: search, $options: 'i' } }
      ];
    }
    if (rating) {
      filter.rating = parseInt(rating);
    }

    const reviews = await Review.find(filter)
      .populate('user', 'username fullName email')
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages,
        totalReviews: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

// Xóa review
export async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ message: 'Xóa review thành công' });
  } catch (error) {
    next(error);
  }
}

// ==================== COUPON MANAGEMENT ====================

// Lấy danh sách tất cả coupons (có phân trang)
export async function getAllCoupons(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const skip = (page - 1) * limit;

    // Tạo filter object
    const filter = {};
    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }
    if (status === 'active') {
      filter.isActive = true;
      filter.$or = [
        { endAt: { $exists: false } },
        { endAt: { $gt: new Date() } }
      ];
    } else if (status === 'expired') {
      filter.endAt = { $lt: new Date() };
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Coupon.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      coupons,
      pagination: {
        currentPage: page,
        totalPages,
        totalCoupons: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

// Tạo coupon mới
export async function createCoupon(req, res, next) {
  try {
    const {
      code,
      type,
      amount,
      maxDiscount,
      minOrder,
      startAt,
      endAt,
      usageLimit,
      isActive
    } = req.body;

    // Kiểm tra code đã tồn tại
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      type,
      amount,
      maxDiscount: maxDiscount || 0,
      minOrder: minOrder || 0,
      startAt: startAt ? new Date(startAt) : new Date(),
      endAt: endAt ? new Date(endAt) : null,
      usageLimit: usageLimit || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    next(error);
  }
}

// Cập nhật coupon
export async function updateCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Nếu có code mới, kiểm tra trùng lặp
    if (updateData.code) {
      const existingCoupon = await Coupon.findOne({ 
        code: updateData.code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Mã khuyến mãi đã tồn tại' });
      }
      updateData.code = updateData.code.toUpperCase();
    }

    // Convert date strings to Date objects
    if (updateData.startAt) updateData.startAt = new Date(updateData.startAt);
    if (updateData.endAt) updateData.endAt = new Date(updateData.endAt);

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json(coupon);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    next(error);
  }
}

// Xóa coupon
export async function deleteCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json({ message: 'Xóa coupon thành công' });
  } catch (error) {
    next(error);
  }
}

// ==================== NOTIFICATION MANAGEMENT ====================

// Lấy danh sách tất cả notifications (có phân trang)
export async function getAllNotifications(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const status = req.query.status || '';

    const skip = (page - 1) * limit;

    // Tạo filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) {
      filter.type = type;
    }
    if (status === 'active') {
      filter.isActive = true;
      filter.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ];
    } else if (status === 'expired') {
      filter.expiresAt = { $lt: new Date() };
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const notifications = await Notification.find(filter)
      .populate('targetUsers', 'username fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalNotifications: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

// Tạo notification mới
export async function createNotification(req, res, next) {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      targetUsers,
      isActive,
      scheduledAt,
      expiresAt,
      imageUrl,
      actionUrl,
      actionText
    } = req.body;

    const notification = new Notification({
      title,
      content,
      type: type || 'general',
      priority: priority || 'medium',
      targetAudience: targetAudience || 'all',
      targetUsers: targetUsers || [],
      isActive: isActive !== undefined ? isActive : true,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      imageUrl,
      actionUrl,
      actionText
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    next(error);
  }
}

// Cập nhật notification
export async function updateNotification(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date strings to Date objects
    if (updateData.scheduledAt) updateData.scheduledAt = new Date(updateData.scheduledAt);
    if (updateData.expiresAt) updateData.expiresAt = new Date(updateData.expiresAt);

    const notification = await Notification.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('targetUsers', 'username fullName email');

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    next(error);
  }
}

// Xóa notification
export async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Xóa thông báo thành công' });
  } catch (error) {
    next(error);
  }
}
