import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

export async function admin(req, res, next) {
  const user = await User.findById(req.user?.id);
  if (user?.role !== 'admin')
    return res.status(403).json({ message: 'Forbidden' });
  next();
}
