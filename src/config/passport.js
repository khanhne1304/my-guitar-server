import 'dotenv/config';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { findOrCreateFacebookUser } from '../services/auth.service.js';

const callbackURL =
	process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:4000/api/auth/facebook/callback';

// Cấu hình chiến lược Facebook
passport.use(
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_APP_ID || '',
			clientSecret: process.env.FACEBOOK_APP_SECRET || '',
			callbackURL,
			profileFields: ['id', 'displayName', 'emails', 'photos'],
		},
		async (_accessToken, _refreshToken, profile, done) => {
			try {
				const email = profile?.emails?.[0]?.value || null;
				const fullName = profile?.displayName || '';
				const facebookId = profile?.id;
				const avatarUrl = profile?.photos?.[0]?.value || null;

				const user = await findOrCreateFacebookUser({
					facebookId,
					email,
					fullName,
					avatarUrl,
				});
				return done(null, user);
			} catch (err) {
				return done(err);
			}
		},
	),
);

export default passport;

