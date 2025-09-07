import User from '../models/User.js';
import bcrypt from 'bcrypt';

export async function getUserProfile(userId) {
  return await User.findById(userId).select('-password');
}

export async function updateUserProfile(userId, data) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new Error('NOT_FOUND');

  const { username, email, fullName, address, phone, password } = data;

  if (username) user.username = username;
  if (email) user.email = email;
  if (fullName) user.fullName = fullName;
  if (address) user.address = address;
  if (phone) user.phone = phone;
  if (password) user.password = await bcrypt.hash(password, 10);

  await user.save();
  return user;
}
