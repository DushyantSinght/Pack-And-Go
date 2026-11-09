// Customer-side claims & service requests.
import express from 'express';
import crypto from 'crypto';
import { DamageClaim, MoveBooking, ServiceRequest, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { notify } from '../services/notify.js';

const router = express.Router();
router.use(requireAuth);

const CLAIM_WINDOW_MS = 48 * 3600_000;
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const shortId = (p) => `${p}-${crypto.randomInt(100000, 1000000)}`;

const notifyStaff = async (title, body) => {
  const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const admins = await User.find({ $or: [{ isAdmin: true }, { email: { $in: envAdmins } }] }).lean();
  admins.forEach((a) => notify(a, { type: 'info', title, body }));
};

// ── Damage claims ────────────────────────────────────────────────
router.post('/claims', async (req, res) => {
  try {
    const { bookingId, description, amountClaimed, boxIds, photos } = req.body;
    const move = await MoveBooking.findOne({ bookingId, userEmail: req.user.email });
    if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (move.status !== 'delivered' || !move.deliveredAt) return res.status(409).json({ success: false, message: 'Claims can be raised after delivery.' });
    if (Date.now() - move.deliveredAt.getTime() > CLAIM_WINDOW_MS) return res.status(409).json({ success: false, message: 'The 48-hour claim window for this move has closed.' });
    if (!String(description || '').trim()) return res.status(400).json({ success: false, message: 'Describe what was damaged or missing.' });
    const pics = (Array.isArray(photos) ? photos : []).slice(0, 3);
    for (const p of pics) {
      if (typeof p !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(p) || p.length * 0.75 > MAX_PHOTO_BYTES) {
        return res.status(400).json({ success: false, message: 'Photos must be PNG/JPEG/WebP under 1.5 MB each (max 3).' });
      }
    }
    const claim = await DamageClaim.create({
      claimId: shortId('CLM'),
      bookingId,
      userEmail: req.user.email,
      captainEmail: move.assignedCaptainEmail,
      description: String(description).slice(0, 2000),
      amountClaimed: Math.max(0, Math.min(200000, Number(amountClaimed) || 0)),
      boxIds: (Array.isArray(boxIds) ? boxIds : []).slice(0, 20).map(String),
      photos: pics
    });
    notify(req.user.email, { type: 'claim', bookingId, title: `Claim ${claim.claimId} received`, body: 'Our team will review it within 2 working days.', email: true });
    notifyStaff(`New damage claim ${claim.claimId}`, `${bookingId} • ₹${claim.amountClaimed}`);
    res.status(201).json({ success: true, claim: { ...claim.toObject(), photos: undefined, photoCount: pics.length } });
  } catch {
    res.status(500).json({ success: false, message: 'Could not file the claim.' });
  }
});

router.get('/claims/mine', async (req, res) => {
  const claims = await DamageClaim.find({ userEmail: req.user.email }).select('-photos').sort({ createdAt: -1 }).lean();
  res.json({ success: true, claims });
});

// ── Service requests (PG visits, cook/cleaning, storage, room setup) ─────
const TYPES = ['visit', 'service', 'storage', 'room_setup'];
router.post('/requests', async (req, res) => {
  try {
    const { type, title, details, preferredDate, bookingId } = req.body;
    if (!TYPES.includes(type) || !String(title || '').trim()) return res.status(400).json({ success: false, message: 'Invalid request.' });
    const me = await User.findById(req.user._id).lean();
    if (!me?.phone) return res.status(400).json({ success: false, code: 'phone_required', message: 'Add your mobile number so our team can confirm with you.' });
    const when = preferredDate ? new Date(preferredDate) : undefined;
    if (when && (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 86400_000)) {
      return res.status(400).json({ success: false, message: 'Choose a date in the future.' });
    }
    const reqDoc = await ServiceRequest.create({
      requestId: shortId('REQ'),
      type,
      title: String(title).slice(0, 200),
      details: details && typeof details === 'object' ? JSON.parse(JSON.stringify(details).slice(0, 4000)) : undefined,
      preferredDate: when,
      userEmail: me.email,
      userName: me.name,
      userPhone: me.phone,
      bookingId
    });
    notify(me, { type: 'info', title: `Request ${reqDoc.requestId} received`, body: `${reqDoc.title}. Our team will call ${me.phone} to confirm.`, email: true });
    notifyStaff(`New request ${reqDoc.requestId}`, `${reqDoc.title} • ${me.name} ${me.phone}`);
    res.status(201).json({ success: true, request: reqDoc });
  } catch {
    res.status(500).json({ success: false, message: 'Could not send the request.' });
  }
});

router.get('/requests/mine', async (req, res) => {
  const requests = await ServiceRequest.find({ userEmail: req.user.email }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ success: true, requests });
});

export default router;
