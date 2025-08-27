const express = require('express');
const router = express.Router();

// Mock users database (in a real app, this would be in a database)
let users = [
  {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    password: '123456' // In real app, this would be hashed
  }
];

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập đầy đủ thông tin' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Mật khẩu phải có ít nhất 6 ký tự' 
      });
    }

    // Check if email already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email đã được sử dụng' 
      });
    }

    // Create new user
    const newUser = {
      id: String(users.length + 1),
      name: name.trim(),
      email: email.trim(),
      password: password // In real app, hash this password
    };

    users.push(newUser);

    res.status(201).json({ 
      message: 'Đăng ký thành công',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập email và mật khẩu' 
      });
    }

    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    // Generate mock token (in real app, use JWT)
    const token = `mock_token_${user.id}_${Date.now()}`;

    res.json({
      message: 'Đăng nhập thành công',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
