import { Router } from 'express';
import { register, login, checkEmail, sendOTPToEmail, verifyOTPCode, resetPasswordWithOTP, resetPasswordWithTokenController, sendOTPForRegisterController, verifyOTPAndRegisterController } from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/check-email', checkEmail);
router.post('/send-otp', sendOTPToEmail);
router.post('/verify-otp', verifyOTPCode);
router.post('/reset-password', resetPasswordWithOTP);
router.post('/reset-password-token', resetPasswordWithTokenController);

// Routes cho đăng ký với OTP
router.post('/send-otp-register', sendOTPForRegisterController);
router.post('/verify-otp-register', verifyOTPAndRegisterController);

export default router;
