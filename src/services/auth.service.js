import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

export async function registerUser({ username, email, fullName, address, phone, password }) {
  // Kiểm tra từng trường riêng biệt để có thông báo lỗi chi tiết
  const existingUsername = await User.findOne({ username }).lean();
  const existingEmail = await User.findOne({ email }).lean();
  const existingPhone = await User.findOne({ phone }).lean();
  
  const conflicts = [];
  if (existingUsername) conflicts.push('username');
  if (existingEmail) conflicts.push('email');
  if (existingPhone) conflicts.push('phone');
  
  if (conflicts.length > 0) {
    const error = new Error('DUPLICATE_FIELDS');
    error.conflicts = conflicts;
    throw error;
  }

  const user = await User.create({
    username,
    email,
    fullName: fullName || '',
    address: address || '',
    phone: phone || '',
    password, // hash trong pre('save')
  });

  const token = signToken(user);
  return { user, token };
}

export async function loginUser(identifier, password) {
  const maybeEmail = identifier.includes('@') ? identifier.toLowerCase() : identifier;
  const user = await User.findOne({
    $or: [{ email: maybeEmail }, { username: identifier }],
  }).select('+password');

  if (!user) throw new Error('INVALID_CREDENTIALS');

  const ok = await user.comparePassword(password);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  const token = signToken(user);
  return { user, token };
}
