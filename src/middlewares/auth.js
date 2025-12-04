import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    // Kiểm tra JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ 
        message: 'Server configuration error: JWT_SECRET not configured' 
      });
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    // Log error để debug
    console.error('Auth error:', error.message);
    
    // Phân loại lỗi cụ thể
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token: Token format is invalid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired: Please login again' });
    }
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Token not active yet' });
    }
    
    res.status(401).json({ message: 'Invalid token: ' + (error.message || 'Authentication failed') });
  }
}

export async function admin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}
