import { validationResult } from 'express-validator';
import { registerUser, loginUser, checkEmailExists, sendOTP, verifyOTP, resetPassword, resetPasswordWithToken, sendOTPForRegister, verifyOTPAndRegister } from '../services/auth.service.js';

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
    if (e.message === 'DUPLICATE_FIELDS') {
      const conflicts = e.conflicts || [];
      let message = '';
      
      if (conflicts.length === 1) {
        const field = conflicts[0];
        switch (field) {
          case 'username':
            message = 'Tên tài khoản đã tồn tại';
            break;
          case 'email':
            message = 'Email đã tồn tại';
            break;
          case 'phone':
            message = 'Số điện thoại đã tồn tại';
            break;
          default:
            message = 'Thông tin đã tồn tại';
        }
      } else if (conflicts.length > 1) {
        const fieldNames = conflicts.map(field => {
          switch (field) {
            case 'username': return 'Tên tài khoản';
            case 'email': return 'Email';
            case 'phone': return 'Số điện thoại';
            default: return field;
          }
        });
        message = `${fieldNames.join(', ')} đã tồn tại`;
      } else {
        message = 'Thông tin đã tồn tại';
      }
      
      return res.status(409).json({ message });
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

// Kiểm tra email có tồn tại trong hệ thống
export async function checkEmail(req, res, next) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    const exists = await checkEmailExists(email);
    
    if (!exists) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }

    res.json({ message: 'Email tồn tại trong hệ thống' });
  } catch (error) {
    next(error);
  }
}

// Gửi OTP đến email
export async function sendOTPToEmail(req, res, next) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    const result = await sendOTP(email);
    res.json({ message: 'OTP đã được gửi đến email của bạn', data: result });
  } catch (error) {
    if (error.message === 'EMAIL_NOT_FOUND') {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }
    next(error);
  }
}

// Xác thực OTP
export async function verifyOTPCode(req, res, next) {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email và OTP là bắt buộc' });
    }

    const result = await verifyOTP(email, otp);
    res.json({ message: 'OTP hợp lệ', data: result });
  } catch (error) {
    if (error.message === 'INVALID_OTP') {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }
    next(error);
  }
}

// Đặt lại mật khẩu với OTP
export async function resetPasswordWithOTP(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP và mật khẩu mới là bắt buộc' });
    }

    const result = await resetPassword(email, otp, newPassword);
    res.json({ message: 'Mật khẩu đã được đặt lại thành công', data: result });
  } catch (error) {
    if (error.message === 'INVALID_OTP') {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }
    next(error);
  }
}

// Đặt lại mật khẩu với token
export async function resetPasswordWithTokenController(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const result = await resetPasswordWithToken(token, newPassword);
    res.json({ message: 'Mật khẩu đã được đặt lại thành công', data: result });
  } catch (error) {
    if (error.message === 'INVALID_TOKEN') {
      return res.status(400).json({ message: 'Token không hợp lệ' });
    }
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(400).json({ message: 'Token đã hết hạn. Vui lòng thực hiện lại quy trình quên mật khẩu' });
    }
    if (error.message === 'EMAIL_NOT_FOUND') {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }
    next(error);
  }
}

// Gửi OTP cho đăng ký
export async function sendOTPForRegisterController(req, res, next) {
  try {
    const { email } = req.body;
    
    console.log('sendOTPForRegisterController - Email:', email);
    
    if (!email) {
      console.log('Missing email');
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    const result = await sendOTPForRegister(email);
    console.log('sendOTPForRegisterController - Result:', result);
    
    res.json({ 
      message: 'OTP đã được gửi đến email của bạn', 
      expiresAt: result.expiresAt 
    });
  } catch (error) {
    console.log('sendOTPForRegisterController - Error:', error.message);
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(400).json({ message: 'Email này đã được sử dụng để đăng ký' });
    }
    next(error);
  }
}

// Xác thực OTP và hoàn thành đăng ký
export async function verifyOTPAndRegisterController(req, res, next) {
  try {
    const { username, email, fullName, address, phone, password, otp } = req.body;
    
    console.log('verifyOTPAndRegisterController - Data:', { 
      username: !!username, 
      email: !!email, 
      password: !!password, 
      otp: !!otp 
    });
    
    if (!username || !email || !password || !otp) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Tất cả các trường bắt buộc phải được điền' });
    }

    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const result = await verifyOTPAndRegister({
      username: username.trim(),
      email: email.trim(),
      fullName: fullName?.trim() || '',
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      password
    }, otp);

    console.log('Controller result:', result);

    if (!result || !result.user || !result.token) {
      console.log('Missing data:', { result: !!result, user: !!result?.user, token: !!result?.token });
      return res.status(500).json({ message: 'Lỗi server khi tạo tài khoản' });
    }

    res.json({
      message: 'Đăng ký thành công',
      token: result.token,
      user: {
        id: result.user._id,
        username: result.user.username,
        email: result.user.email,
        fullName: result.user.fullName,
        address: result.user.address,
        phone: result.user.phone,
        createdAt: result.user.createdAt
      }
    });
  } catch (error) {
    console.log('verifyOTPAndRegisterController - Error:', error.message);
    console.log('verifyOTPAndRegisterController - Error stack:', error.stack);
    
    if (error.message === 'OTP_NOT_FOUND') {
      return res.status(400).json({ message: 'OTP không tồn tại hoặc đã hết hạn' });
    }
    if (error.message === 'OTP_EXPIRED') {
      return res.status(400).json({ message: 'OTP đã hết hạn. Vui lòng gửi lại' });
    }
    if (error.message === 'OTP_TOO_MANY_ATTEMPTS') {
      return res.status(400).json({ message: 'Quá nhiều lần nhập sai OTP. Vui lòng gửi lại' });
    }
    if (error.message === 'OTP_INVALID') {
      return res.status(400).json({ message: 'OTP không đúng' });
    }
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(400).json({ message: 'Email này đã được sử dụng để đăng ký' });
    }
    if (error.message === 'DUPLICATE_FIELDS') {
      const conflicts = error.conflicts || [];
      let message = '';
      
      if (conflicts.includes('username')) {
        message = 'Tên tài khoản đã tồn tại';
      } else if (conflicts.includes('email')) {
        message = 'Email đã tồn tại';
      } else if (conflicts.includes('phone')) {
        message = 'Số điện thoại đã tồn tại';
      } else {
        message = 'Thông tin đã tồn tại trong hệ thống';
      }
      
      return res.status(400).json({ 
        message,
        conflicts: error.conflicts 
      });
    }
    
    // Log tất cả các lỗi khác
    console.error('Unexpected error in verifyOTPAndRegisterController:', error);
    return res.status(500).json({ 
      message: 'Lỗi server không xác định', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}