import express from 'express';
import mongoose from 'mongoose';
import { User, Conversation, Message, PooledCorridor, MarketplaceItem } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { isOnline, emitToUsers } from '../socket.js';

const router = express.Router();
router.use(requireAuth);

const PUBLIC_USER_FIELDS = 'name email phone avatar userType rating tripsCompleted';

/** Shape a user for the client, adding live presence. */
export const publicUser = (u) => ({
  _id: String(u._id),
  name: u.name,
  email: u.email,
  phone: u.phone || null,
  avatar: u.avatar,
  userType: u.userType,
  rating: u.rating,
  tripsCompleted: u.tripsCompleted,
  online: isOnline(String(u._id))
});

/** Shape a conversation for a specific viewer. */
export const serializeConversation = (conv, viewerId) => {
  const others = conv.participants.filter((p) => String(p._id) !== String(viewerId));
  return {
    _id: String(conv._id),
    context: conv.context,
    participants: conv.participants.map(publicUser),
    otherUser: others[0] ? publicUser(others[0]) : null,
    lastMessage: conv.lastMessage?.text ? conv.lastMessage : null,
    unread: conv.unread?.get?.(String(viewerId)) || 0,
    updatedAt: conv.updatedAt
  };
};

export const serializeMessage = (m) => ({
  _id: String(m._id),
  conversation: String(m.conversation),
  sender: String(m.sender?._id || m.sender),
  kind: m.kind,
  text: m.text,
  readBy: (m.readBy || []).map(String),
  createdAt: m.createdAt
});

/** Resolve who the customer wants to reach from what they clicked on. */
const resolveContact = async ({ contextType, refId, userId }) => {
  if (contextType === 'driver') {
    const corridor = await PooledCorridor.findOne({ corridorId: refId });
    if (!corridor?.driver?.email) return null;
    const user = await User.findOne({ email: corridor.driver.email });
    return user && { user, title: `Move Captain · ${corridor.name}` };
  }
  if (contextType === 'seller') {
    const item = await MarketplaceItem.findOne({ itemId: refId });
    if (!item?.seller?.email) return null;
    const user = await User.findOne({ email: item.seller.email });
    return user && { user, title: item.title };
  }
  if (contextType === 'direct' && mongoose.isValidObjectId(userId)) {
    const user = await User.findById(userId);
    return user && { user, title: 'Direct message' };
  }
  return null;
};

/** Load a conversation only if the requester is a participant. */
const loadOwnConversation = async (id, userId) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Conversation.findOne({ _id: id, participants: userId }).populate('participants', PUBLIC_USER_FIELDS);
};

// POST /api/chat/conversations — find or create a thread with a driver / seller
router.post('/conversations', async (req, res) => {
  try {
    const { contextType, refId, userId } = req.body;
    const contact = await resolveContact({ contextType, refId, userId });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'This person is not reachable on Pack&Go yet.' });
    }
    const me = String(req.user._id);
    const them = String(contact.user._id);
    if (me === them) {
      return res.status(400).json({ success: false, message: "That's you! You can't message yourself." });
    }

    const key = [me, them].sort().join(':') + `|${contextType}:${refId || ''}`;
    let conv = await Conversation.findOneAndUpdate(
      { key },
      {
        $setOnInsert: {
          key,
          participants: [me, them],
          context: { type: contextType, refId, title: contact.title }
        }
      },
      { upsert: true, returnDocument: 'after' }
    ).populate('participants', PUBLIC_USER_FIELDS);

    res.json({ success: true, conversation: serializeConversation(conv, me) });
  } catch (error) {
    console.error('chat start error:', error);
    res.status(500).json({ success: false, message: 'Could not open the conversation.' });
  }
});

// GET /api/chat/conversations — my inbox
router.get('/conversations', async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('participants', PUBLIC_USER_FIELDS);
    res.json({ success: true, conversations: convs.map((c) => serializeConversation(c, req.user._id)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load your inbox.' });
  }
});

// GET /api/chat/conversations/:id/messages — history (latest 200)
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conv = await loadOwnConversation(req.params.id, req.user._id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    const msgs = await Message.find({ conversation: conv._id }).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, messages: msgs.reverse().map(serializeMessage) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load messages.' });
  }
});

/** Shared by REST + socket: persist a message and fan it out to participants. */
export const createMessage = async ({ conversationId, senderId, text, kind = 'text' }) => {
  const clean = String(text || '').trim().slice(0, 2000);
  if (!clean) throw Object.assign(new Error('Message is empty.'), { status: 400 });
  const conv = await loadOwnConversation(conversationId, senderId);
  if (!conv) throw Object.assign(new Error('Conversation not found.'), { status: 404 });

  const msg = await Message.create({
    conversation: conv._id,
    sender: senderId,
    kind: kind === 'call' ? 'call' : 'text',
    text: clean,
    readBy: [senderId]
  });

  conv.lastMessage = { text: clean, kind: msg.kind, sender: senderId, createdAt: msg.createdAt };
  for (const p of conv.participants) {
    const pid = String(p._id);
    if (pid !== String(senderId)) conv.unread.set(pid, (conv.unread.get(pid) || 0) + 1);
  }
  await conv.save();

  const payload = serializeMessage(msg);
  for (const p of conv.participants) {
    emitToUsers([String(p._id)], 'chat:message', {
      message: payload,
      conversation: serializeConversation(conv, p._id)
    });
  }
  return payload;
};

// POST /api/chat/conversations/:id/messages — send (REST fallback for sockets)
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const message = await createMessage({
      conversationId: req.params.id,
      senderId: req.user._id,
      text: req.body.text,
      kind: req.body.kind
    });
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

// POST /api/chat/conversations/:id/read — clear my unread count
router.post('/conversations/:id/read', async (req, res) => {
  try {
    const me = String(req.user._id);
    const conv = await loadOwnConversation(req.params.id, me);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    conv.unread.set(me, 0);
    await conv.save();
    await Message.updateMany({ conversation: conv._id, readBy: { $ne: me } }, { $addToSet: { readBy: me } });
    const others = conv.participants.map((p) => String(p._id)).filter((id) => id !== me);
    emitToUsers(others, 'chat:read', { conversationId: String(conv._id), userId: me });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not mark as read.' });
  }
});

export default router;
