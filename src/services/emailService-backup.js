import nodemailer from 'nodemailer';

// Alternative: Sử dụng SendGrid hoặc Mailgun
// Hoặc tạm thời sử dụng console log cho development

export async function sendOTPEmail(email, otp) {
  // Tạm thời log OTP ra console cho development
  console.log(`\n📧 OTP Email Simulation:`);
  console.log(`To: ${email}`);
  console.log(`Subject: Mã OTP đặt lại mật khẩu - My Guitar`);
  console.log(`OTP Code: ${otp}`);
  console.log(`Expires: 5 minutes\n`);
  
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return true;
}

// Test email connection (always return true for simulation)
export async function testEmailConnection() {
  console.log('📧 Email service running in simulation mode');
  return true;
}



