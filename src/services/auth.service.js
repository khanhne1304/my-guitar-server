import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import crypto from 'crypto';
import { sendOTPEmail } from './emailService.js';

export function signToken(user) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    return jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
  } catch (error) {
    console.error('Error signing token:', error);
    throw error;
  }
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

  // Chỉ cho phép đăng nhập mật khẩu với tài khoản local
  if (user.provider && user.provider !== 'local') {
    throw new Error('INVALID_CREDENTIALS');
  }
  if (!user.password) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const ok = await user.comparePassword(password);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  const token = signToken(user);
  return { user, token };
}

// Kiểm tra email có tồn tại trong hệ thống
export async function checkEmailExists(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  return !!user;
}

// Tạo OTP 6 số ngẫu nhiên
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Lưu OTP vào database (tạm thời lưu trong memory, có thể cải thiện bằng Redis)
const otpStore = new Map();

// Gửi OTP đến email
export async function sendOTP(email) {
  // Kiểm tra email có tồn tại
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('EMAIL_NOT_FOUND');
  }

  // Tạo OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  // Lưu OTP (trong thực tế nên dùng Redis)
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt,
    attempts: 0
  });

  // Gửi email OTP thực tế
  try {
    await sendOTPEmail(email, otp, 'reset');
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    throw new Error('Không thể gửi email OTP');
  }

  return {
    expiresAt
  };
}

// Xác thực OTP
export async function verifyOTP(email, otp) {
  const storedData = otpStore.get(email.toLowerCase());
  
  if (!storedData) {
    throw new Error('INVALID_OTP');
  }

  // Kiểm tra số lần thử
  if (storedData.attempts >= 3) {
    otpStore.delete(email.toLowerCase());
    throw new Error('INVALID_OTP');
  }

  // Kiểm tra hết hạn
  if (new Date() > storedData.expiresAt) {
    otpStore.delete(email.toLowerCase());
    throw new Error('INVALID_OTP');
  }

  // Kiểm tra OTP
  if (storedData.otp !== otp) {
    storedData.attempts++;
    throw new Error('INVALID_OTP');
  }

  // Xác thực thành công, tạo reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

  // Lưu reset token
  otpStore.set(`reset_${email.toLowerCase()}`, {
    token: resetToken,
    email: email.toLowerCase(),
    expiresAt: tokenExpiresAt
  });

  // Xóa OTP
  otpStore.delete(email.toLowerCase());

  return {
    verified: true,
    email: email.toLowerCase(),
    resetToken: resetToken
  };
}

// Đặt lại mật khẩu với OTP
export async function resetPassword(email, otp, newPassword) {
  // Xác thực OTP trước
  await verifyOTP(email, otp);

  // Tìm user và cập nhật mật khẩu
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('EMAIL_NOT_FOUND');
  }

  user.password = newPassword;
  await user.save();

  return {
    success: true,
    email: email.toLowerCase()
  };
}

// Đặt lại mật khẩu với token
export async function resetPasswordWithToken(token, newPassword) {
  // Tìm reset token
  let tokenData = null;
  for (const [key, value] of otpStore.entries()) {
    if (key.startsWith('reset_') && value.token === token) {
      tokenData = value;
      break;
    }
  }

  if (!tokenData) {
    throw new Error('INVALID_TOKEN');
  }

  // Kiểm tra hết hạn
  if (new Date() > tokenData.expiresAt) {
    otpStore.delete(`reset_${tokenData.email}`);
    throw new Error('TOKEN_EXPIRED');
  }

  // Tìm user và cập nhật mật khẩu
  const user = await User.findOne({ email: tokenData.email });
  if (!user) {
    throw new Error('EMAIL_NOT_FOUND');
  }

  user.password = newPassword;
  await user.save();

  // Xóa reset token
  otpStore.delete(`reset_${tokenData.email}`);

  return {
    success: true,
    email: tokenData.email
  };
}

// Gửi OTP cho đăng ký (kiểm tra email chưa tồn tại)
export async function sendOTPForRegister(email) {
  console.log('sendOTPForRegister - Email:', email);
  
  // Kiểm tra email đã tồn tại chưa
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  console.log('sendOTPForRegister - Existing user:', !!existingUser);
  
  if (existingUser) {
    console.log('sendOTPForRegister - Email already exists');
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  // Tạo OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
  console.log('sendOTPForRegister - Generated OTP:', otp);

  // Lưu OTP với prefix để phân biệt với OTP reset password
  otpStore.set(`register_${email.toLowerCase()}`, {
    otp,
    expiresAt,
    attempts: 0
  });

  // Gửi email OTP
  try {
    console.log('sendOTPForRegister - Sending email...');
    await sendOTPEmail(email, otp, 'register');
    console.log('sendOTPForRegister - Email sent successfully');
  } catch (error) {
    console.error('Failed to send register OTP email:', error);
    throw new Error('Không thể gửi email OTP');
  }

  return {
    expiresAt
  };
}

// Xác thực OTP và hoàn thành đăng ký
export async function verifyOTPAndRegister({ username, email, fullName, address, phone, password }, otp) {
  console.log('verifyOTPAndRegister - Email:', email, 'OTP:', otp);
  
  // Validation dữ liệu đầu vào
  if (!username || !email || !password || !otp) {
    throw new Error('Missing required fields');
  }
  
  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Kiểm tra OTP
  const otpKey = `register_${email.toLowerCase()}`;
  const otpData = otpStore.get(otpKey);
  
  console.log('verifyOTPAndRegister - OTP Key:', otpKey);
  console.log('verifyOTPAndRegister - OTP Data exists:', !!otpData);
  
  if (!otpData) {
    console.log('verifyOTPAndRegister - OTP not found');
    throw new Error('OTP_NOT_FOUND');
  }

  if (new Date() > otpData.expiresAt) {
    console.log('verifyOTPAndRegister - OTP expired');
    otpStore.delete(otpKey);
    throw new Error('OTP_EXPIRED');
  }

  if (otpData.attempts >= 3) {
    console.log('verifyOTPAndRegister - Too many attempts');
    otpStore.delete(otpKey);
    throw new Error('OTP_TOO_MANY_ATTEMPTS');
  }

  if (otpData.otp !== otp) {
    console.log('verifyOTPAndRegister - Invalid OTP');
    otpData.attempts++;
    otpStore.set(otpKey, otpData);
    throw new Error('OTP_INVALID');
  }

  console.log('verifyOTPAndRegister - OTP verified successfully');
  
  // Xóa OTP sau khi xác thực thành công
  otpStore.delete(otpKey);

  // Kiểm tra lại email và username chưa tồn tại (trong trường hợp có race condition)
  const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
  const existingUserByUsername = await User.findOne({ username });
  
  if (existingUserByEmail) {
    console.log('verifyOTPAndRegister - Email already exists during verification');
    throw new Error('EMAIL_ALREADY_EXISTS');
  }
  
  if (existingUserByUsername) {
    console.log('verifyOTPAndRegister - Username already exists during verification');
    const error = new Error('DUPLICATE_FIELDS');
    error.conflicts = ['username'];
    throw error;
  }

  // Tạo user mới
  console.log('verifyOTPAndRegister - Creating user...');
  try {
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      fullName: fullName || '',
      address: address || '',
      phone: phone || undefined, // Không lưu empty string cho phone
      password, // hash trong pre('save')
    });

    console.log('Created user:', user);

    const token = signToken(user);
    console.log('Generated token:', token ? 'OK' : 'FAILED');
    
    return { user, token };
  } catch (createError) {
    console.error('Error creating user:', createError);
    
    // Kiểm tra lỗi duplicate
    if (createError.code === 11000) {
      const field = Object.keys(createError.keyPattern || {})[0] || 'field';
      console.log('Duplicate field:', field);
      
      const error = new Error('DUPLICATE_FIELDS');
      error.conflicts = [field];
      throw error;
    }
    
    // Re-throw lỗi khác
    throw createError;
  }
}

// ---- Social login helpers ----
async function generateUniqueUsername(base) {
  const normalized = (base || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 24);
  let candidate = normalized || 'user';
  let counter = 0;
  while (counter < 50) {
    const maybe = counter === 0 ? candidate : `${candidate}${Math.floor(Math.random() * 10000)}`;
    const trimmed = maybe.slice(0, 30);
    const exists = await User.findOne({ username: trimmed }).lean();
    if (!exists) return trimmed;
    counter++;
  }
  return `user_${crypto.randomInt(100000, 999999)}`;
}

export async function findOrCreateFacebookUser({ facebookId, email, fullName, avatarUrl }) {
  let user = null;
  if (facebookId) {
    user = await User.findOne({ facebookId });
  }
  if (!user && email) {
    user = await User.findOne({ email: email.toLowerCase() });
  }

  if (user) {
    let changed = false;
    if (!user.facebookId && facebookId) {
      user.facebookId = facebookId;
      user.provider = 'facebook';
      changed = true;
    }
    if (!user.avatarUrl && avatarUrl) {
      user.avatarUrl = avatarUrl;
      changed = true;
    }
    if (!user.fullName && fullName) {
      user.fullName = fullName;
      changed = true;
    }
    if (changed) await user.save();
    return user;
  }

  const baseUsername =
    email ? email.split('@')[0] : (fullName || `fb_${facebookId || crypto.randomInt(1000, 9999)}`);
  const uniqueUsername = await generateUniqueUsername(baseUsername);

  user = await User.create({
    username: uniqueUsername,
    email: (email || `${uniqueUsername}@facebook.local`).toLowerCase(),
    fullName: fullName || '',
    address: '',
    phone: undefined,
    provider: 'facebook',
    facebookId: facebookId || undefined,
    avatarUrl: avatarUrl || undefined,
  });

  return user;
}

export async function findOrCreateGoogleUser({ googleId, email, fullName, avatarUrl }) {
  let user = null;
  if (googleId) {
    user = await User.findOne({ googleId });
  }
  if (!user && email) {
    user = await User.findOne({ email: email.toLowerCase() });
  }

  if (user) {
    let changed = false;
    if (!user.googleId && googleId) {
      user.googleId = googleId;
      user.provider = 'google';
      changed = true;
    }
    if (!user.avatarUrl && avatarUrl) {
      user.avatarUrl = avatarUrl;
      changed = true;
    }
    if (!user.fullName && fullName) {
      user.fullName = fullName;
      changed = true;
    }
    if (changed) await user.save();
    return user;
  }

  const baseUsername =
    email ? email.split('@')[0] : (fullName || `gg_${googleId || crypto.randomInt(1000, 9999)}`);
  const uniqueUsername = await generateUniqueUsername(baseUsername);

  user = await User.create({
    username: uniqueUsername,
    email: (email || `${uniqueUsername}@google.local`).toLowerCase(),
    fullName: fullName || '',
    address: '',
    phone: undefined,
    provider: 'google',
    googleId: googleId || undefined,
    avatarUrl: avatarUrl || undefined,
  });

  return user;
}
