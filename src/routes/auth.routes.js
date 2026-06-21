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

// ---- OAuth (Facebook & Google) ----
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Trình duyệt/mạng đôi khi gửi NHIỀU request callback song song với cùng một
 * `code`. Mã code OAuth chỉ đổi được 1 lần → các request trùng sẽ lỗi
 * "authorization code has been used". Cache theo `code` để chỉ đổi 1 lần và
 * mọi request trùng dùng lại cùng kết quả (đều redirect thành công).
 */
const oauthCodeCache = new Map(); // code -> Promise<redirectUrl>
const OAUTH_CODE_TTL_MS = 60 * 1000;

function buildAuthRedirect(req, user) {
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
	return `${FRONTEND_URL}/auth/callback?token=${encodedToken}&user=${encodedUser}${state}`;
}

function makeOAuthCallback(strategy) {
	const failureRedirect = `${FRONTEND_URL}/login?error=${strategy}`;
	return (req, res, next) => {
		const code = req.query?.code;

		// Request trùng (cùng code) → chờ kết quả của request đầu tiên
		if (code && oauthCodeCache.has(code)) {
			oauthCodeCache
				.get(code)
				.then((url) => res.redirect(url))
				.catch(() => res.redirect(failureRedirect));
			return;
		}

		let resolveCache;
		let rejectCache;
		if (code) {
			const p = new Promise((resolve, reject) => {
				resolveCache = resolve;
				rejectCache = reject;
			});
			// chống unhandled rejection khi không có request trùng nào lắng nghe
			p.catch(() => {});
			oauthCodeCache.set(code, p);
			setTimeout(() => oauthCodeCache.delete(code), OAUTH_CODE_TTL_MS);
		}

		passport.authenticate(strategy, { session: false }, (err, user) => {
			if (err || !user) {
				rejectCache?.(err || new Error('no user'));
				return res.redirect(failureRedirect);
			}
			try {
				const url = buildAuthRedirect(req, user);
				resolveCache?.(url);
				return res.redirect(url);
			} catch (e) {
				rejectCache?.(e);
				return res.redirect(failureRedirect);
			}
		})(req, res, next);
	};
}

// Facebook
router.get('/facebook', (req, res, next) => {
	const opts = { scope: ['email'] };
	if (req.query.state) {
		opts.state = req.query.state;
	}
	return passport.authenticate('facebook', opts)(req, res, next);
});
router.get('/facebook/callback', makeOAuthCallback('facebook'));

// Google
router.get('/google', (req, res, next) => {
	const opts = { scope: ['profile', 'email'] };
	if (req.query.state) {
		opts.state = req.query.state;
	}
	return passport.authenticate('google', opts)(req, res, next);
});
router.get('/google/callback', makeOAuthCallback('google'));

export default router;
