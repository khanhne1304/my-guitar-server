import User from '../models/User.js';
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
