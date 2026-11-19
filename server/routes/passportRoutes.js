// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Box passports belong to the customer who packed them. Captains can read the
// boxes on jobs they have accepted; nobody else can see or change them.
import express from 'express';
import crypto from 'crypto';
import { LuggagePassport, MoveBooking, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { isAdminUser } from '../middleware/roles.js';

const router = express.Router();
router.use(requireAuth);

const EDITABLE = ['label', 'category', 'fragile', 'itemsContained', 'boxSize', 'preMovePhotoUrl'];
const cleanPhoto = (v) => {
  const s = String(v || '').trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(s) && s.length < 2048) return s;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length * 0.75 <= 1.5 * 1024 * 1024) return s;
  return '';
};

/** Bookings whose boxes this user may read. */
const readableFilter = async (req) => {
  const me = await User.findById(req.user._id).lean();
  if (isAdminUser(me)) return {};
  if (me?.userType === 'captain') {
    const jobs = await MoveBooking.find({ assignedCaptainEmail: me.email }).select('bookingId').lean();
    return { $or: [{ userEmail: me.email }, { bookingId: { $in: jobs.map((j) => j.bookingId) } }] };
  }
  return { userEmail: req.user.email };
};

// GET /api/passports — my boxes (or, for a captain, boxes on my jobs)
router.get('/', async (req, res) => {
  try {
    const passports = await LuggagePassport.find(await readableFilter(req)).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: passports.length, passports });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load your boxes.' });
  }
});

// POST /api/passports — add a box to my current booking
router.post('/', async (req, res) => {
  try {
    const { category, label, fragile, items, boxSize, preMovePhotoUrl, bookingId } = req.body;
    const owned = bookingId ? await MoveBooking.findOne({ bookingId, userEmail: req.user.email }).lean() : null;
    const booking = owned || (await MoveBooking.findOne({ userEmail: req.user.email }).sort({ updatedAt: -1 }).lean());
    const count = await LuggagePassport.countDocuments({ userEmail: req.user.email, ...(booking && { bookingId: booking.bookingId }) });
    const boxId = `PKG-BOX-${crypto.randomInt(100000, 1000000)}${fragile ? '-F' : ''}`;
    const list = (Array.isArray(items) ? items : String(items || '').split(','))
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 40);

    const box = await LuggagePassport.create({
      boxId,
      userEmail: req.user.email,
      bookingId: booking?.bookingId,
      boxNumber: `Box ${String(count + 1).padStart(2, '0')}`,
      category: String(category || 'General Household').slice(0, 60),
      label: String(label || 'Packed carton').slice(0, 120),
      fragile: !!fragile,
      boxSize: String(boxSize || 'Medium (18" x 14" x 12")').slice(0, 60),
      sealStatus: 'Sealed by customer',
      conditionAtOrigin: 'Packed & sealed',
      conditionAtDropoff: 'Pending delivery check',
      preMovePhotoUrl: cleanPhoto(preMovePhotoUrl),
      postMovePhotoUrl: '',
      itemsContained: list.length ? list : ['Packed belongings'],
      depositProtectionNote: 'Scanned by your Move Captain at loading and at delivery.',
      // The Move Captain's scanner reads this JSON payload.
      qrDataString: JSON.stringify({ boxId, bookingId: booking?.bookingId || null })
    });
    res.status(201).json({ success: true, box });
  } catch {
    res.status(500).json({ success: false, message: 'Could not save the box.' });
  }
});

// GET /api/passports/:boxId — one box I may read
router.get('/:boxId', async (req, res) => {
  const box = await LuggagePassport.findOne({ boxId: req.params.boxId, ...(await readableFilter(req)) });
  if (!box) return res.status(404).json({ success: false, message: 'Box passport not found.' });
  res.json({ success: true, box });
});

// PATCH /api/passports/:boxId — owner edits safe fields only
router.patch('/:boxId', async (req, res) => {
  const updates = Object.fromEntries(EDITABLE.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  if (updates.preMovePhotoUrl !== undefined) updates.preMovePhotoUrl = cleanPhoto(updates.preMovePhotoUrl);
  if (updates.fragile !== undefined) updates.fragile = !!updates.fragile;
  const box = await LuggagePassport.findOneAndUpdate({ boxId: req.params.boxId, userEmail: req.user.email }, { $set: updates }, { returnDocument: 'after' });
  if (!box) return res.status(404).json({ success: false, message: 'Box passport not found.' });
  res.json({ success: true, box });
});

/** Startup fix: seeded boxes created before ownership existed belong to the seed customer. */
export const assignLegacyPassports = async () => {
  const r = await LuggagePassport.updateMany(
    { $or: [{ userEmail: { $exists: false } }, { userEmail: null }, { userEmail: '' }] },
    { $set: { userEmail: 'dushyant@packandgo.in' } }
  );
  return r.modifiedCount;
};

export default router;
