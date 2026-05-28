/**
 * Holds the Socket.IO server instance so HTTP controllers can emit realtime events
 * without circular imports. Set once from server bootstrap.
 */
let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}
