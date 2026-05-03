import jwt from 'jsonwebtoken';

/**
 * Minimal presence (online users) via Socket.IO.
 * - Client connects with: io(origin, { auth: { token }, transports:['websocket'] })
 * - Server verifies JWT and broadcasts `presence:onlineUsers` with online user ids.
 */
export function registerPresence(io) {
  const socketUser = new Map(); // socket.id -> userId

  function broadcastOnline() {
    const ids = Array.from(new Set(Array.from(socketUser.values()).map(String)));
    io.emit('presence:onlineUsers', { onlineUserIds: ids });
  }

  io.use((socket, next) => {
    try {
      const token = socket?.handshake?.auth?.token;
      if (!token) return next(new Error('UNAUTHORIZED'));
      if (!process.env.JWT_SECRET) return next(new Error('JWT_SECRET_NOT_SET'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = payload?.id;
      return next();
    } catch (e) {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket?.data?.userId;
    if (uid) {
      const idStr = String(uid);
      socketUser.set(socket.id, idStr);
      // Personal room for forum / notification fan-out
      socket.join(`user:${idStr}`);
    }
    broadcastOnline();

    socket.on('disconnect', () => {
      socketUser.delete(socket.id);
      broadcastOnline();
    });
  });
}

