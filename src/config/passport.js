import 'dotenv/config';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateFacebookUser, findOrCreateGoogleUser } from '../services/auth.service.js';

const callbackURL =
	process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:4000/api/auth/facebook/callback';
const googleCallbackURL =
	process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback';

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

// Cấu hình chiến lược Google
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID || '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
			callbackURL: googleCallbackURL,
		},
		async (_accessToken, _refreshToken, profile, done) => {
			try {
				const email =
					profile?.emails?.find((e) => e?.verified) ?.value ||
					profile?.emails?.[0]?.value ||
					null;
				const fullName = profile?.displayName || `${profile?.name?.givenName || ''} ${profile?.name?.familyName || ''}`.trim();
				const googleId = profile?.id;
				const avatarUrl = profile?.photos?.[0]?.value || null;
				const user = await findOrCreateGoogleUser({
					googleId,
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

