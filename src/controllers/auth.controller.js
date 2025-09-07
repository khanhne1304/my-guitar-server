import { validationResult } from 'express-validator';
import { registerUser, loginUser } from '../services/auth.service.js';

export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, fullName, address, phone, password } = req.body;
    const { user, token } = await registerUser({ username, email, fullName, address, phone, password });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        address: user.address,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (e) {
    if (e.message === 'USER_EXISTS') {
      return res.status(409).json({ message: 'Username hoặc Email đã tồn tại' });
    }
    if (e?.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `${field} đã tồn tại` });
    }
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { identifier, password } = req.body;
    const { user, token } = await loginUser(identifier, password);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        address: user.address,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (e) {
    if (e.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }
    next(e);
  }
}
