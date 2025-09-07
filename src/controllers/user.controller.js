import { getUserProfile, updateUserProfile } from '../services/user.service.js';

export async function getProfile(req, res, next) {
  try {
    const user = await getUserProfile(req.user.id);
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await updateUserProfile(req.user.id, req.body);

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
    if (e.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'User not found' });
    }
    next(e);
  }
}
