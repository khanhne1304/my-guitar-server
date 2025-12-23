import { Router } from 'express';
import { register, login, checkEmail, sendOTPToEmail, verifyOTPCode, resetPasswordWithOTP, resetPasswordWithTokenController, sendOTPForRegisterController, verifyOTPAndRegisterController } from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../validators/auth.validator.js';
import passport from 'passport';
import { signToken } from '../services/auth.service.js';

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

// ---- Facebook OAuth ----
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
router.get('/facebook', (req, res, next) => {
	const opts = { scope: ['email'] };
	if (req.query.state) {
		opts.state = req.query.state;
	}
	return passport.authenticate('facebook', opts)(req, res, next);
});
router.get(
	'/facebook/callback',
	passport.authenticate('facebook', {
		session: false,
		failureRedirect: `${FRONTEND_URL}/login?error=facebook`,
	}),
	(req, res) => {
		try {
			const user = req.user;
			const token = signToken(user);
			const payload = {
				id: user._id,
				username: user.username,
				email: user.email,
				fullName: user.fullName,
				address: user.address,
				phone: user.phone,
				role: user.role,
			};
			const encodedUser = encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64'));
			const encodedToken = encodeURIComponent(token);
			const state = req.query?.state ? `&state=${encodeURIComponent(req.query.state)}` : '';
			return res.redirect(`${FRONTEND_URL}/auth/callback?token=${encodedToken}&user=${encodedUser}${state}`);
		} catch {
			return res.redirect(`${FRONTEND_URL}/login?error=facebook`);
		}
	},
);

export default router;
