import express from 'express';
import mongoose from 'mongoose';
import { Notification, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSms, smsConfigured, e164 } from '../services/notify.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications — latest 50 + unread count
router.get('/', async (req, res) => {
  try {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);
    res.json({ success: true, unread, notifications: items });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load notifications.' });
  }
});

router.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

router.post('/:id/read', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false });
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { $set: { read: true } });
  res.json({ success: true });
});

// POST /api/notifications/test-sms — sends a test SMS to the signed-in user's own phone only
router.post('/test-sms', async (req, res) => {
  const me = await User.findById(req.user._id).lean();
  if (!e164(me?.phone)) return res.status(400).json({ success: false, message: 'Add a mobile number to your account first.' });
  const result = await sendSms({ to: me.phone, body: 'Pack&Go test alert: SMS updates for your move are working.' });
  res.json({
    success: result === 'sent' || result === 'logged',
    result,
    message:
      result === 'sent' ? `Test SMS sent to ${e164(me.phone)}.`
      : result === 'logged' ? 'SMS provider not configured — the message was written to the server log instead. Add TWILIO_* keys to send real SMS.'
      : 'SMS failed to send. Check the server log.',
    smsConfigured: smsConfigured()
  });
});

export default router;
