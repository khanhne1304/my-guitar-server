import User from '../models/User.js';
import bcrypt from 'bcrypt';

// Lấy thông tin user hiện tại
export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (e) {
    next(e);
  }
}

// Cập nhật thông tin
export async function updateProfile(req, res, next) {
  try {
    const { username, email, fullName, address, phone, password } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (address) user.address = address;
    if (phone) user.phone = phone;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      address: user.address,
      phone: user.phone,
      role: user.role,
    });
  } catch (e) {
    next(e);
  }
}
