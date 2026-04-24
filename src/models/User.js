import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
	{
		username: { type: String, required: true, unique: true, trim: true },
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			index: true,
		},
		fullName: { type: String, trim: true },
		address: { type: String },
		phone: { type: String, unique: true, sparse: true },
		// Cho phép tài khoản mạng xã hội không cần mật khẩu
		password: {
			type: String,
			required: function () {
				return this.provider === 'local';
			},
			select: false,
		},
		role: { type: String, enum: ['user', 'admin'], default: 'user' },
		// --- Social login fields ---
		provider: { type: String, enum: ['local', 'facebook', 'google'], default: 'local', index: true },
		facebookId: { type: String, unique: true, sparse: true, index: true },
		googleId: { type: String, unique: true, sparse: true, index: true },
		avatarUrl: { type: String },

		// --- Forum / social profile ---
		bio: { type: String, trim: true },
		location: { type: String, trim: true },
		birthday: { type: String, trim: true },
		education: { type: String, trim: true },
		website: { type: String, trim: true },
		facebookUrl: { type: String, trim: true },
		youtubeUrl: { type: String, trim: true },
		tiktokUrl: { type: String, trim: true },

		// --- Friends / social graph ---
		friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
		friendRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
		friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],

		// --- Blocks ---
		blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
	},
	{ timestamps: true },
);

// Hash mật khẩu khi tạo/sửa
userSchema.pre('save', async function (next) {
	if (!this.isModified('password') || !this.password) return next();
	this.password = await bcrypt.hash(this.password, 10);
	next();
});

// So sánh mật khẩu
userSchema.methods.comparePassword = function (plain) {
	return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);
