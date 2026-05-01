class WebSocketEnhancements {
  constructor(io) {
    this.io = io;
    this.presence = new Map();
    this.history = new Map();
    this.middleware = [];
  }

  use(fn) {
    this.middleware.push(fn);
    if (this.io && this.io.use) this.io.use(fn);
    return this;
  }

  joinRoom(socket, room) {
    socket.join(room);
    return room;
  }

  leaveRoom(socket, room) {
    socket.leave(room);
    return room;
  }

  broadcast(room, event, payload) {
    this.remember(room, event, payload);
    return this.io.to(room).emit(event, payload);
  }

  privateMessage(userSocketMap, toUserId, event, payload) {
    const socketId = userSocketMap.get(toUserId);
    if (!socketId) return false;
    this.io.to(socketId).emit(event, payload);
    return true;
  }

  setPresence(userId, status = 'online') {
    const entry = { userId, status, updatedAt: new Date().toISOString() };
    this.presence.set(userId, entry);
    return entry;
  }

  getPresence(userId) {
    return this.presence.get(userId) || { userId, status: 'offline' };
  }

  remember(room, event, payload) {
    if (!this.history.has(room)) this.history.set(room, []);
    const messages = this.history.get(room);
    messages.push({ event, payload, timestamp: new Date().toISOString() });
    if (messages.length > 1000) messages.shift();
  }

  getHistory(room, limit = 50) {
    return (this.history.get(room) || []).slice(-limit);
  }
}

module.exports = WebSocketEnhancements;
