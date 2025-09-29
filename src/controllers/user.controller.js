import { getUserProfile, updateUserProfile } from '../services/user.service.js';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
export async function getProfile(req, res, next) {
  try {
    const user = await getUserProfile(req.user.id);
    res.json(user);
  } catch (e) {
    next(e);
  }
}
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Mật khẩu mới tối thiểu 6 ký tự" });

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (e) {
    next(e);
  }
}
export async function updateProfile(req, res, next) {
  try {
    if ('password' in req.body) delete req.body.password; // double-check an toàn
    const user = await updateUserProfile(req.user.id, req.body);
    res.json(user); // đã select -password ở service
  } catch (e) {
    if (e.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'User not found' });
    }
    next(e);
  }
}