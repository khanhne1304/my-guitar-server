import User from '../models/User.js';
import { getIO } from '../lib/ioRegistry.js';

const PUBLIC_FIELDS = 'username fullName avatarUrl';

function formatUser(u) {
	if (!u) return null;
	return {
		id: u._id.toString(),
		name: u.fullName || u.username || 'Người dùng',
		avatarUrl: u.avatarUrl || '',
	};
}

/**
 * Push tin nhắn mới tới phòng Socket.IO của người gửi và người nhận.
 */
export async function emitDirectMessage({ senderId, recipientId, message }) {
	const io = getIO();
	if (!io || !message?.id) return;

	const [sender, recipient] = await Promise.all([
		User.findById(senderId).select(PUBLIC_FIELDS).lean(),
		User.findById(recipientId).select(PUBLIC_FIELDS).lean(),
	]);

	const base = {
		id: message.id,
		text: message.text,
		at: message.at,
		senderId: String(senderId),
		recipientId: String(recipientId),
	};

	io.to(`user:${recipientId}`).emit('message:new', {
		...base,
		message: { id: message.id, text: message.text, fromMe: false, at: message.at },
		peer: formatUser(sender),
	});

	io.to(`user:${senderId}`).emit('message:new', {
		...base,
		message: { id: message.id, text: message.text, fromMe: true, at: message.at },
		peer: formatUser(recipient),
	});
}
