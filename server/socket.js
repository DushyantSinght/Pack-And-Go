// Real-time layer: chat delivery, typing, presence and WebRTC call signalling.
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { Conversation, User } from './models/index.js';
import { createMessage } from './routes/chatRoutes.js';
import { verifyToken } from './middleware/auth.js';

let io = null;
const onlineCounts = new Map(); // userId -> number of open sockets

export const isOnline = (userId) => (onlineCounts.get(String(userId)) || 0) > 0;

export const emitToUsers = (userIds, event, payload) => {
  if (!io) return;
  for (const id of userIds) io.to(`user:${id}`).emit(event, payload);
};

/** Users who share at least one conversation with `userId` (for presence + call auth). */
const contactsOf = async (userId) => {
  const convs = await Conversation.find({ participants: userId }).select('participants').lean();
  const ids = new Set();
  for (const c of convs) for (const p of c.participants) if (String(p) !== String(userId)) ids.add(String(p));
  return [...ids];
};

const sharesConversation = async (a, b) => {
  if (!mongoose.isValidObjectId(b)) return false;
  return !!(await Conversation.exists({ participants: { $all: [a, b] } }));
};

export const initSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true }
  });

  // Auth + profile lookup happen here, before 'connection', so event handlers
  // below are attached synchronously and no early client emit is dropped.
  io.use(async (socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token);
    } catch {
      return next(new Error('unauthorized'));
    }
    const me = await User.findById(socket.user._id).select('name avatar phone').lean().catch(() => null);
    if (!me) return next(new Error('unauthorized'));
    socket.profile = { _id: String(socket.user._id), name: me.name, avatar: me.avatar, phone: me.phone };
    next();
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    const prev = onlineCounts.get(userId) || 0;
    onlineCounts.set(userId, prev + 1);
    if (prev === 0) {
      contactsOf(userId).then((ids) => emitToUsers(ids, 'presence', { userId, online: true })).catch(() => {});
    }

    // ── Chat ───────────────────────────────────────────────────────
    socket.on('chat:send', async ({ conversationId, text, kind } = {}, ack) => {
      try {
        const message = await createMessage({ conversationId, senderId: userId, text, kind });
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('chat:typing', async ({ conversationId, typing } = {}) => {
      if (!mongoose.isValidObjectId(conversationId)) return;
      const conv = await Conversation.findOne({ _id: conversationId, participants: userId }).select('participants').lean();
      if (!conv) return;
      const others = conv.participants.map(String).filter((id) => id !== userId);
      emitToUsers(others, 'chat:typing', { conversationId, userId, typing: !!typing });
    });

    // ── Calls (WebRTC signalling relay) ───────────────────────────
    // Only relayed between people who already share a conversation.
    const relay = (event) => {
      socket.on(event, async (payload = {}, ack) => {
        const { to } = payload;
        if (!(await sharesConversation(userId, to))) return ack?.({ ok: false, error: 'not-allowed' });
        if (event === 'call:invite' && !isOnline(to)) return ack?.({ ok: false, error: 'offline' });
        emitToUsers([to], event, { ...payload, from: socket.profile });
        ack?.({ ok: true });
      });
    };
    ['call:invite', 'call:accept', 'call:reject', 'call:ice', 'call:end'].forEach(relay);

    socket.on('disconnect', () => {
      const n = (onlineCounts.get(userId) || 1) - 1;
      if (n <= 0) {
        onlineCounts.delete(userId);
        contactsOf(userId).then((ids) => emitToUsers(ids, 'presence', { userId, online: false })).catch(() => {});
      } else {
        onlineCounts.set(userId, n);
      }
    });
  });

  return io;
};
