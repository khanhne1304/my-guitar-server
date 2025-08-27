const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock users database
let users = [
  {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    password: '123456'
  }
];

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'MyMusic Auth API is working!', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
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
      password: password
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

// Login endpoint
app.post('/api/auth/login', (req, res) => {
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

    // Generate mock token
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

const PORT = 5000;

app.listen(PORT, () => {
  console.log('🔐 MyMusic Auth API Server');
  console.log('==========================');
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET / - Health check`);
  console.log(`   POST /api/auth/register - Register new user`);
  console.log(`   POST /api/auth/login - Login user`);
  console.log('');
  console.log('✅ Ready to handle authentication!');
  console.log('');
  console.log('Test accounts:');
  console.log('   Email: test@example.com');
  console.log('   Password: 123456');
});
