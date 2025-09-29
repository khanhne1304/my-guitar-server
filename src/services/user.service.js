import User from '../models/User.js';
import bcrypt from 'bcrypt';

export async function getUserProfile(userId) {
  return await User.findById(userId).select('-password');
}

export async function updateUserProfile(userId, data) {
  // Loại bỏ password ngay từ đầu nếu có trong data
  if ('password' in data) delete data.password;

  // Chỉ lấy những field được phép sửa
  const allowedFields = ['username', 'email', 'fullName', 'address', 'phone'];
  const updates = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) updates[key] = data[key];
  }

  // Dùng findByIdAndUpdate để tránh trigger pre-save hook của password
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  ).select('-password'); // luôn loại password khi trả về

  if (!updatedUser) throw new Error('NOT_FOUND');
  return updatedUser;
}