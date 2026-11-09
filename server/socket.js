// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Real-time layer: chat delivery, typing, presence and WebRTC call signalling.
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { Conversation, User, MoveBooking } from './models/index.js';
import { haversineKm } from './services/pricing.js';
import { notify } from './services/notify.js';
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

export const initSocket = (httpServer, corsOrigin) => {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true }
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

    // ── Live GPS from the assigned Move Captain ──────────────────
    const lastSaved = new Map(); // bookingId -> ms
    socket.on('driver:location', async (p = {}, ack) => {
      try {
        const lat = Number(p.lat), lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return ack?.({ ok: false });
        const me = await User.findById(userId).select('email userType captain.status').lean();
        if (me?.userType !== 'captain' || me.captain?.status !== 'approved') return ack?.({ ok: false, error: 'not-approved' });
        const move = await MoveBooking.findOne({ bookingId: p.bookingId, assignedCaptainEmail: me.email, status: { $in: ['assigned', 'in_transit'] } });
        if (!move) return ack?.({ ok: false, error: 'not-your-active-job' });

        const loc = {
          lat, lng,
          speedKmh: Number.isFinite(+p.speedKmh) ? Math.max(0, Math.min(150, +p.speedKmh)) : null,
          heading: Number.isFinite(+p.heading) ? +p.heading : null,
          updatedAt: new Date()
        };
        const owner = await User.findOne({ email: move.userEmail }).select('_id').lean();
        const target = move.status === 'assigned' ? move.originLocation : move.destinationLocation;
        const kmLeft = target?.lat ? haversineKm(loc, target) : null;
        const etaMin = kmLeft != null ? Math.max(1, Math.round((kmLeft * 1.3) / 22 * 60)) : null; // ~22 km/h city average
        if (owner) emitToUsers([String(owner._id)], 'booking:location', { bookingId: move.bookingId, ...loc, kmLeft, etaMin, status: move.status });

        if (Date.now() - (lastSaved.get(move.bookingId) || 0) > 10000) {
          lastSaved.set(move.bookingId, Date.now());
          const set = { driverLocation: loc };
          if (move.status === 'assigned' && kmLeft != null && kmLeft < 2 && !move.nearbyNotifiedAt) {
            set.nearbyNotifiedAt = new Date();
            notify(move.userEmail, { type: 'driver', bookingId: move.bookingId, title: `Your Move Captain is about ${etaMin} min away`, body: 'Keep your Pickup OTP ready — share it only once your boxes are loaded.', sms: true });
          }
          await MoveBooking.updateOne({ _id: move._id }, { $set: set });
        }
        ack?.({ ok: true, kmLeft, etaMin });
      } catch {
        ack?.({ ok: false });
      }
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
