import nodemailer from 'nodemailer';

function shouldUseConsoleOtp() {
  if (process.env.OTP_CONSOLE_MODE === 'true') return true;
  if (process.env.OTP_CONSOLE_MODE === 'false') return false;
  if (process.env.NODE_ENV === 'production') {
    return !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD;
  }
  // Mặc định local/staging: in OTP ra console (tránh treo SMTP khi dev)
  return true;
}

function createMailTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function sendOTPEmail(email, otp, type = 'reset') {
  if (shouldUseConsoleOtp()) {
    return true;
  }

  const transporter = createMailTransporter();

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: type === 'register' ? 'Mã OTP xác thực đăng ký - My Guitar' : 'Xác thực đổi mật khẩu - Mã OTP từ My Guitar',
    html: type === 'register' ? getRegisterOTPHTML(otp) : getResetPasswordOTPHTML(otp)
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    throw new Error('Không thể gửi email OTP. Vui lòng thử lại sau.');
  }
}

// Test email connection
export async function testEmailConnection() {
  if (shouldUseConsoleOtp()) {
    return true;
  }

  try {
    const transporter = createMailTransporter();
    
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}

// HTML template cho email đăng ký
function getRegisterOTPHTML(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #fffbe8; padding: 20px; border-radius: 10px; border: 1px solid #ffd700;">
        <h2 style="color: #000; text-align: center; margin-bottom: 20px;">🎸 My Guitar</h2>
        <h3 style="color: #333;">Chào mừng bạn đến với My Guitar!</h3>
        
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>My Guitar</strong> - nơi bạn có thể khám phá và mua sắm những cây đàn guitar chất lượng tốt nhất.</p>
        
        <p><strong>Mã xác thực đăng ký của bạn là:</strong></p>
        <div style="background: #000; color: #ffd700; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #ffd700; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4caf50;">
          <p style="margin: 0 0 10px 0;"><strong>🎉 Sau khi xác thực thành công:</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Bạn sẽ được đăng nhập tự động</li>
            <li>Có thể mua sắm và đặt hàng ngay lập tức</li>
            <li>Nhận được ưu đãi đặc biệt cho thành viên mới</li>
            <li>Theo dõi đơn hàng và lịch sử mua sắm</li>
          </ul>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>⚠️ Lưu ý quan trọng:</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Mã OTP có hiệu lực trong <strong>5 phút</strong></li>
            <li>Chỉ sử dụng được <strong>một lần</strong></li>
            <li>Không chia sẻ mã này với ai khác</li>
            <li>Nếu không phải bạn đăng ký, vui lòng bỏ qua email này</li>
          </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-weight: bold; color: #856404;">💡 Mẹo:</p>
          <p style="margin: 5px 0 0 0; color: #856404;">Hãy nhập mã OTP vào form đăng ký để hoàn tất quá trình tạo tài khoản và bắt đầu trải nghiệm mua sắm tại My Guitar!</p>
        </div>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        Email này được gửi tự động từ hệ thống My Guitar.<br>
        Vui lòng không trả lời email này.<br>
        © 2025 My Guitar. All rights reserved.
      </p>
    </div>
  `;
}

// HTML template cho email reset password
function getResetPasswordOTPHTML(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #fffbe8; padding: 20px; border-radius: 10px; border: 1px solid #ffd700;">
        <h2 style="color: #000; text-align: center; margin-bottom: 20px;">🎸 My Guitar</h2>
        <h3 style="color: #333;">Xác thực đổi mật khẩu</h3>
        
        <p>Xin chào,</p>
        <p>Bạn vừa yêu cầu <strong>đổi mật khẩu</strong> cho tài khoản My Guitar của mình.</p>
        <p>Vui lòng sử dụng <strong>mã OTP</strong> bên dưới để xác nhận yêu cầu:</p>
        
        <div style="background: #000; color: #ffd700; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <h1 style="color: #ffd700; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>⚠️ Lưu ý quan trọng:</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Mã OTP có hiệu lực trong <strong>5 phút</strong></li>
            <li>Mã chỉ sử dụng <strong>một lần</strong></li>
            <li>Không chia sẻ mã này với bất kỳ ai</li>
            <li>Nếu không phải bạn thực hiện, vui lòng bỏ qua email này</li>
          </ul>
        </div>
        
        <p style="color:#333">Sau khi nhập đúng OTP, bạn sẽ được tiến hành đổi mật khẩu mới.</p>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px; text-align: center;">
        Email này được gửi tự động từ hệ thống My Guitar.<br>
        Vui lòng không trả lời email này.<br>
        © 2025 My Guitar. All rights reserved.
      </p>
    </div>
  `;
}
