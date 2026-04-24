import User from '../models/User.js';

export async function listUsersService({ page = 1, limit = 10, search, role }) {
  const skip = (page - 1) * limit;
  
  // Xây dựng query
  const query = {};
  
  // Tìm kiếm theo username, email, fullName
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { fullName: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Lọc theo role
  if (role) {
    query.role = role;
  }
  
  // Đếm tổng số users
  const total = await User.countDocuments(query);
  
  // Lấy danh sách users
  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    users,
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

export async function createUserService(userData) {
  // Kiểm tra username, email, phone đã tồn tại chưa
  const existingUsername = await User.findOne({ username: userData.username });
  if (existingUsername) {
    throw new Error('DUPLICATE_USERNAME');
  }
  
  const existingEmail = await User.findOne({ email: userData.email.toLowerCase() });
  if (existingEmail) {
    throw new Error('DUPLICATE_EMAIL');
  }
  
  if (userData.phone) {
    const existingPhone = await User.findOne({ phone: userData.phone });
    if (existingPhone) {
      throw new Error('DUPLICATE_PHONE');
    }
  }
  
  // Tạo user mới (password sẽ được hash tự động trong pre-save hook)
  const user = await User.create({
    username: userData.username,
    email: userData.email.toLowerCase(),
    fullName: userData.fullName || '',
    address: userData.address || '',
    phone: userData.phone || '',
    password: userData.password,
    role: userData.role || 'user'
  });
  
  return user.toObject({ transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }});
}

export async function updateUserService(userId, userData) {
  // Không cho phép update password qua endpoint này
  if (userData.password) {
    delete userData.password;
  }
  
  // Kiểm tra user có tồn tại không
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  
  // Kiểm tra duplicate nếu update username, email, phone
  if (userData.username && userData.username !== user.username) {
    const existing = await User.findOne({ username: userData.username });
    if (existing) {
      throw new Error('DUPLICATE_USERNAME');
    }
  }
  
  if (userData.email && userData.email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: userData.email.toLowerCase() });
    if (existing) {
      throw new Error('DUPLICATE_EMAIL');
    }
  }
  
  if (userData.phone && userData.phone !== user.phone) {
    const existing = await User.findOne({ phone: userData.phone });
    if (existing) {
      throw new Error('DUPLICATE_PHONE');
    }
  }
  
  // Chỉ cho phép update các field được phép
  const allowedFields = ['username', 'email', 'fullName', 'address', 'phone', 'role'];
  const updates = {};
  for (const key of allowedFields) {
    if (userData[key] !== undefined) {
      if (key === 'email') {
        updates[key] = userData[key].toLowerCase();
      } else {
        updates[key] = userData[key];
      }
    }
  }
  
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password');
  
  if (!updatedUser) {
    throw new Error('USER_NOT_FOUND');
  }
  
  return updatedUser;
}

export async function deleteUserService(userId) {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  return { message: 'User deleted successfully' };
}

