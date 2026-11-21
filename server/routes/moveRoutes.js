// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import crypto from 'crypto';
import { MoveBooking, User, LuggagePassport, generateOtp } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApprovedCaptain } from '../middleware/roles.js';
import { quote, roadDistanceKm, slotStart, TIME_SLOTS, refundPercentFor, PLATFORM_FEE_RATE, OPEN_JOB_GRACE_MS } from '../services/pricing.js';
import { refund, recordPayout, demoPaymentsEnabled } from '../services/payments.js';
import { notify } from '../services/notify.js';

const router = express.Router();
router.use(requireAuth);

// Fields a customer may set on their DRAFT estimate. Everything else — OTPs,
// payment/escrow/transit status, owner, captain — is server-controlled.
const DRAFT_EDITABLE = [
  'origin', 'destination', 'presetId', 'items', 'totalCuFt', 'estimatedWeightKg', 'cartons',
  'labour', 'vehicle', 'soloPrice', 'pooledPrice', 'savingsPercent', 'isPriceLocked',
  'selectedTheme', 'selectedEssentials'
];
// After booking, only cosmetic add-ons can still change.
const BOOKED_EDITABLE = ['selectedTheme', 'selectedEssentials'];

const ACTIVE = ['confirmed', 'assigned', 'in_transit'];
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));
const statusOf = (m) => m.status || 'draft';

/** What the booking owner sees (includes their own OTPs). */
const ownerView = (move) => {
  const m = move.toObject();
  delete m.otpFailedAttempts;
  delete m.otpLockedUntil;
  m.status = statusOf(m);
  m.refundPercentIfCancelled = refundPercentFor(m);
  return m;
};

/** What a Move Captain sees — never the OTPs. */
const captainView = (move, myEmail) => ({
  bookingId: move.bookingId,
  status: statusOf(move),
  userName: move.userName,
  userPhone: move.assignedCaptainEmail === myEmail ? move.userPhone : undefined, // phone only after accepting
  origin: move.origin,
  destination: move.destination,
  originLocation: move.originLocation,
  destinationLocation: move.destinationLocation,
  distanceKm: move.distanceKm,
  moveDate: move.moveDate,
  timeSlot: move.timeSlot,
  totalCuFt: move.totalCuFt,
  items: (move.items || []).map((i) => ({ name: i.name, fragile: i.fragile })),
  floorsOrigin: move.floorsOrigin,
  floorsDestination: move.floorsDestination,
  hasLiftOrigin: move.hasLiftOrigin,
  hasLiftDestination: move.hasLiftDestination,
  notes: move.notes,
  loadedBoxes: move.loadedBoxes || [],
  payout: move.priceBreakdown?.subtotal ? Math.round(move.priceBreakdown.subtotal * (1 - PLATFORM_FEE_RATE)) : null,
  transitStatus: move.transitStatus,
  stage: move.deliveredAt ? 'completed' : move.pickupVerifiedAt ? 'delivery' : 'pickup',
  assignedToMe: move.assignedCaptainEmail === myEmail
});

const newBookingId = () => `PKG-MOV-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;

const createDraftFor = async (reqUser, data = {}) => {
  const me = await User.findById(reqUser._id).lean();
  return MoveBooking.create({
    origin: '',
    destination: '',
    presetId: 'studio-pg',
    totalCuFt: 115,
    estimatedWeightKg: 190,
    isPriceLocked: false,
    escrowStatus: 'pending',
    status: 'draft',
    transitStatus: 'Draft estimate',
    ...pick(data, DRAFT_EDITABLE),
    bookingId: newBookingId(),
    userEmail: reqUser.email,
    userName: me?.name || 'Pack&Go customer',
    userPhone: me?.phone || ''
  });
};

/** A real map point: numeric, in range (rejects strings like "x" and NaN). */
const validLoc = (p) => {
  const lat = Number(p?.lat), lng = Number(p?.lng);
  return p != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
};

const findOwn = (bookingId, email) => MoveBooking.findOne({ bookingId, userEmail: email });

/** Add the assigned captain's public profile to owner views. */
const withCaptains = async (views) => {
  const emails = [...new Set(views.map((v) => v.assignedCaptainEmail).filter(Boolean))];
  if (!emails.length) return views;
  const caps = await User.find({ email: { $in: emails } })
    .select('email name phone avatar rating ratingCount tripsCompleted captain.vehicleNumber captain.vehicleType')
    .lean();
  const byEmail = Object.fromEntries(caps.map((c) => [c.email, c]));
  return views.map((v) => {
    const c = byEmail[v.assignedCaptainEmail];
    if (!c) return v;
    return {
      ...v,
      captain: {
        _id: String(c._id), name: c.name, phone: c.phone, avatar: c.avatar, rating: c.ratingCount ? c.rating : null,
        ratingCount: c.ratingCount || 0, tripsCompleted: c.tripsCompleted, vehicleNumber: c.captain?.vehicleNumber, vehicleType: c.captain?.vehicleType
      }
    };
  });
};

// GET /api/moves/slots — bookable time windows
router.get('/slots', (req, res) => res.json({ success: true, slots: TIME_SLOTS }));

// POST /api/moves/quote — price preview from volume + addresses
router.post('/quote', async (req, res) => {
  try {
    const { originLocation, destinationLocation } = req.body;
    if (!validLoc(originLocation) || !validLoc(destinationLocation)) {
      return res.status(400).json({ success: false, message: 'Pick both addresses from the suggestions so we can price the distance.' });
    }
    // Always measure the distance ourselves — never trust one sent by the browser.
    const distanceKm = (await roadDistanceKm(originLocation, destinationLocation)) ?? 0;
    res.json({ success: true, distanceKm, quote: quote({ ...req.body, distanceKm }) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not calculate a quote.' });
  }
});

// GET /api/moves/mine — all my bookings (newest first)
router.get('/mine', async (req, res) => {
  const moves = await MoveBooking.find({ userEmail: req.user.email, status: { $ne: 'draft' } }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, moves: await withCaptains(moves.map(ownerView)) });
});

// GET /api/moves/current — my active booking, else my draft estimate (created on first visit)
router.get('/current', async (req, res) => {
  try {
    let move =
      (await MoveBooking.findOne({ userEmail: req.user.email, status: { $in: [...ACTIVE, 'pending_payment'] } }).sort({ moveDate: 1 })) ||
      (await MoveBooking.findOne({ userEmail: req.user.email, $or: [{ status: 'draft' }, { status: { $exists: false } }] }).sort({ updatedAt: -1 }));
    if (!move) move = await createDraftFor(req.user);
    res.json({ success: true, move: ownerView(move) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load your booking.' });
  }
});

// POST /api/moves — save changes to my draft estimate (or add-ons on a booked move)
router.post('/', async (req, res) => {
  try {
    let move = req.body.bookingId ? await findOwn(req.body.bookingId, req.user.email) : null;
    if (!move) move = await MoveBooking.findOne({ userEmail: req.user.email, $or: [{ status: 'draft' }, { status: { $exists: false } }] }).sort({ updatedAt: -1 });
    if (!move) {
      move = await createDraftFor(req.user, req.body);
    } else {
      move.set(pick(req.body, statusOf(move) === 'draft' ? DRAFT_EDITABLE : BOOKED_EDITABLE));
      await move.save();
    }
    res.json({ success: true, move: ownerView(move) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not save your booking.' });
  }
});

// POST /api/moves/book — turn my draft into a real booking awaiting payment
router.post('/book', async (req, res) => {
  try {
    // Never take a booking that can't be paid for.
    if (!demoPaymentsEnabled()) return res.status(503).json({ success: false, code: 'payments_off', message: 'Bookings are paused: payments are switched off on this server.' });
    const me = await User.findById(req.user._id);
    if (!me.emailVerified) {
      return res.status(403).json({ success: false, code: 'email_unverified', message: 'Please verify your email before booking a move.' });
    }
    const b = req.body;
    const phone = String(b.contactPhone || me.phone || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: 'A valid 10-digit mobile number is required so your Move Captain can reach you.' });
    if (!String(b.origin || '').trim() || !String(b.destination || '').trim()) {
      return res.status(400).json({ success: false, message: 'Pickup and drop-off addresses are required.' });
    }
    if (!validLoc(b.originLocation) || !validLoc(b.destinationLocation)) {
      return res.status(400).json({ success: false, message: 'Pick both addresses from the suggestions so we can find them on the map.' });
    }
    const moveDate = slotStart(b.date, b.timeSlot);
    if (!moveDate) return res.status(400).json({ success: false, message: 'Choose a valid date and time slot.' });
    if (moveDate.getTime() < Date.now() + 3 * 3600_000) return res.status(400).json({ success: false, message: 'Bookings need at least 3 hours notice.' });
    if (moveDate.getTime() > Date.now() + 60 * 86400_000) return res.status(400).json({ success: false, message: 'You can book up to 60 days ahead.' });

    let draft = b.bookingId ? await findOwn(b.bookingId, req.user.email) : null;
    if (draft && statusOf(draft) !== 'draft') draft = null;

    const totalCuFt = Number(b.totalCuFt ?? draft?.totalCuFt) || 0;
    if (totalCuFt < 10) return res.status(400).json({ success: false, message: 'Add the items you are moving first.' });
    if (totalCuFt > 2000) return res.status(400).json({ success: false, message: 'That is more than one truck can carry — contact us for a multi-truck move.' });
    const distanceKm = await roadDistanceKm(b.originLocation, b.destinationLocation);
    const pooled = b.pooled !== false;
    const q = quote({ ...b, totalCuFt, distanceKm, pooled });

    const fields = {
      ...pick(b, DRAFT_EDITABLE),
      totalCuFt,
      origin: String(b.origin).slice(0, 300),
      destination: String(b.destination).slice(0, 300),
      originLocation: { lat: +b.originLocation.lat, lng: +b.originLocation.lng },
      destinationLocation: { lat: +b.destinationLocation.lat, lng: +b.destinationLocation.lng },
      distanceKm,
      moveDate,
      timeSlot: TIME_SLOTS.find((s) => s.id === b.timeSlot).label,
      floorsOrigin: Math.max(0, Math.min(40, +b.floorsOrigin || 0)),
      floorsDestination: Math.max(0, Math.min(40, +b.floorsDestination || 0)),
      hasLiftOrigin: b.hasLiftOrigin !== false,
      hasLiftDestination: b.hasLiftDestination !== false,
      notes: String(b.notes || '').slice(0, 500),
      priceBreakdown: q,
      soloPrice: q.soloTotal,
      pooledPrice: q.total,
      savingsPercent: q.soloTotal ? Math.round((1 - q.total / q.soloTotal) * 100) : 0,
      isPriceLocked: true,
      status: 'pending_payment',
      escrowStatus: 'pending',
      transitStatus: 'Awaiting payment',
      userName: me.name,
      userPhone: phone,
      pickupOtp: generateOtp(),
      deliveryOtp: generateOtp(),
      paymentDetails: { status: 'unpaid', amountPaid: 0 }
    };
    if (!me.phone) await User.updateOne({ _id: me._id }, { $set: { phone } });

    let move;
    if (draft) {
      draft.set(fields);
      move = await draft.save();
    } else {
      move = await MoveBooking.create({ ...fields, bookingId: newBookingId(), userEmail: req.user.email });
    }
    res.status(201).json({ success: true, move: ownerView(move) });
  } catch (err) {
    console.error('book error', err);
    res.status(500).json({ success: false, message: 'Could not create the booking.' });
  }
});

// GET /api/moves/:bookingId — one of my bookings
router.get('/:bookingId', async (req, res, next) => {
  if (req.params.bookingId === 'captain') return next();
  const move = await findOwn(req.params.bookingId, req.user.email);
  if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true, move: (await withCaptains([ownerView(move)]))[0] });
});

// POST /api/moves/:bookingId/share — a read-only live-tracking link the customer can send to family.
router.post('/:bookingId/share', async (req, res) => {
  const move = await MoveBooking.findOne({ bookingId: req.params.bookingId, userEmail: req.user.email }).select('+trackToken');
  if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!ACTIVE.includes(statusOf(move))) {
    return res.status(409).json({ success: false, message: 'Family tracking links are available once your move is paid and until it is delivered.' });
  }
  if (!move.trackToken) {
    move.trackToken = crypto.randomBytes(18).toString('base64url');
    await move.save();
  }
  res.json({ success: true, token: move.trackToken });
});

// DELETE /api/moves/:bookingId/share — turn the family link off (anyone holding it loses access).
router.delete('/:bookingId/share', async (req, res) => {
  const r = await MoveBooking.updateOne({ bookingId: req.params.bookingId, userEmail: req.user.email }, { $unset: { trackToken: 1 } });
  if (!r.matchedCount) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true });
});

// POST /api/moves/:bookingId/cancel { reason }
router.post('/:bookingId/cancel', async (req, res) => {
  try {
    const move = await findOwn(req.params.bookingId, req.user.email);
    if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const st = statusOf(move);
    if (['in_transit', 'delivered', 'cancelled', 'draft'].includes(st)) {
      return res.status(409).json({ success: false, message: st === 'in_transit' ? 'Your goods are already on the truck — contact support.' : `This booking can't be cancelled (${st}).` });
    }
    const pct = refundPercentFor(move);
    const paid = move.paymentDetails?.status === 'paid' ? move.paymentDetails.amountPaid || 0 : 0;
    const refundAmount = Math.round((paid * pct) / 100);
    // Claim the cancellation atomically so two simultaneous requests can't both refund.
    const claimed = await MoveBooking.updateOne({ _id: move._id, status: st }, { $set: { status: 'cancelled', transitStatus: 'Cancelled' } });
    if (!claimed.modifiedCount) return res.status(409).json({ success: false, message: 'This booking was just updated — refresh and try again.' });
    let refundInfo = { refunded: 0 };
    try {
      if (refundAmount > 0) refundInfo = await refund(move, refundAmount, req.body.reason);
    } catch (e) {
      await MoveBooking.updateOne({ _id: move._id }, { $set: { status: st, transitStatus: move.transitStatus } }); // undo, nothing was refunded
      throw e;
    }

    const captainEmail = move.assignedCaptainEmail;
    move.status = 'cancelled';
    move.transitStatus = 'Cancelled';
    if (!refundAmount) move.escrowStatus = paid ? 'released_to_captain' : 'pending';
    move.cancellation = { at: new Date(), reason: String(req.body.reason || '').slice(0, 300), refundPercent: pct, by: 'customer' };
    await move.save();

    notify(req.user.email, {
      type: 'booking',
      bookingId: move.bookingId,
      title: `Booking ${move.bookingId} cancelled`,
      body: refundAmount ? `₹${refundAmount.toLocaleString('en-IN')} (${pct}%) has been refunded (simulated — academic demo, no real money moves).` : paid ? 'No refund applies under the cancellation policy (less than 4 hours before the slot).' : 'No payment had been taken.',
      email: true
    });
    if (captainEmail) notify(captainEmail, { type: 'booking', bookingId: move.bookingId, title: `Job ${move.bookingId} was cancelled by the customer`, sms: true });
    res.json({ success: true, move: ownerView(move), refund: refundInfo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Could not cancel.' });
  }
});

// POST /api/moves/:bookingId/reschedule { date, timeSlot }
router.post('/:bookingId/reschedule', async (req, res) => {
  const move = await findOwn(req.params.bookingId, req.user.email);
  if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!['pending_payment', 'confirmed', 'assigned'].includes(statusOf(move))) {
    return res.status(409).json({ success: false, message: 'This booking can no longer be rescheduled.' });
  }
  // Once a captain has committed, changes close 4h before the slot. With no captain yet (including a
  // slot that passed without one) the customer can always move it.
  if (move.assignedCaptainEmail && move.moveDate && move.moveDate.getTime() - Date.now() < 4 * 3600_000) {
    return res.status(409).json({ success: false, message: 'Rescheduling closes 4 hours before your slot.' });
  }
  if ((move.rescheduledCount || 0) >= 2) return res.status(409).json({ success: false, message: 'A booking can be rescheduled at most twice.' });
  const d = slotStart(req.body.date, req.body.timeSlot);
  if (!d || d.getTime() < Date.now() + 3 * 3600_000 || d.getTime() > Date.now() + 60 * 86400_000) {
    return res.status(400).json({ success: false, message: 'Choose a slot at least 3 hours from now and within 60 days.' });
  }
  move.moveDate = d;
  move.timeSlot = TIME_SLOTS.find((s) => s.id === req.body.timeSlot).label;
  move.rescheduledCount = (move.rescheduledCount || 0) + 1;
  move.missedSlotAlertAt = undefined; // new slot, new chance
  move.overduePickupAlertAt = undefined;
  const captainEmail = move.assignedCaptainEmail;
  // A new time may not suit the assigned captain — release the job back to the pool.
  if (captainEmail) {
    move.assignedCaptainEmail = undefined;
    move.assignedAt = undefined;
    move.status = 'confirmed';
    move.transitStatus = 'Rescheduled • Finding your Move Captain';
  }
  await move.save();
  const when = d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  notify(req.user.email, { type: 'booking', bookingId: move.bookingId, title: `Move rescheduled to ${when}`, email: true });
  if (captainEmail) notify(captainEmail, { type: 'booking', bookingId: move.bookingId, title: `Job ${move.bookingId} was rescheduled and released`, body: `New time: ${when}. Accept it again from the Driver Console if it suits you.`, sms: true });
  res.json({ success: true, move: ownerView(move) });
});

// POST /api/moves/:bookingId/review { rating, comment }
router.post('/:bookingId/review', async (req, res) => {
  const move = await findOwn(req.params.bookingId, req.user.email);
  if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (statusOf(move) !== 'delivered') return res.status(409).json({ success: false, message: 'You can rate your move once it has been delivered.' });
  if (move.review?.rating) return res.status(409).json({ success: false, message: 'You have already rated this move.' });
  const rating = Math.round(Number(req.body.rating));
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ success: false, message: 'Rating must be 1 to 5 stars.' });
  move.review = { rating, comment: String(req.body.comment || '').slice(0, 1000), at: new Date() };
  await move.save();
  if (move.assignedCaptainEmail) {
    const cap = await User.findOne({ email: move.assignedCaptainEmail });
    if (cap) {
      const n = (cap.ratingCount || 0) + 1;
      cap.rating = Math.round((((cap.rating || 0) * (n - 1) + rating) / n) * 100) / 100;
      cap.ratingCount = n;
      await cap.save();
      notify(cap, { type: 'driver', bookingId: move.bookingId, title: `You got ${'★'.repeat(rating)} from ${move.userName}`, body: move.review.comment || undefined });
    }
  }
  res.json({ success: true, move: ownerView(move) });
});

// ── Move Captain endpoints ───────────────────────────────────────

// GET /api/moves/captain/jobs — paid jobs nobody has taken + my active jobs
router.get('/captain/jobs', requireApprovedCaptain, async (req, res) => {
  try {
    const email = req.dbUser.email;
    const jobs = await MoveBooking.find({
      $or: [
        // Open jobs: paid, unclaimed, and the slot hasn't long passed.
        { status: 'confirmed', moveDate: { $gte: new Date(Date.now() - OPEN_JOB_GRACE_MS) }, $or: [{ assignedCaptainEmail: { $exists: false } }, { assignedCaptainEmail: null }] },
        { status: { $in: ['assigned', 'in_transit'] }, assignedCaptainEmail: email }
      ]
    })
      .sort({ moveDate: 1 })
      .limit(30);
    res.json({ success: true, jobs: jobs.map((j) => captainView(j, email)) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load jobs.' });
  }
});

// POST /api/moves/captain/jobs/:bookingId/accept — claim an open paid job
router.post('/captain/jobs/:bookingId/accept', requireApprovedCaptain, async (req, res) => {
  const cap = req.dbUser;
  const move = await MoveBooking.findOneAndUpdate(
    { bookingId: req.params.bookingId, status: 'confirmed', moveDate: { $gte: new Date(Date.now() - OPEN_JOB_GRACE_MS) }, $or: [{ assignedCaptainEmail: { $exists: false } }, { assignedCaptainEmail: null }] },
    { $set: { assignedCaptainEmail: cap.email, assignedAt: new Date(), status: 'assigned', transitStatus: `Move Captain ${cap.name} assigned` } },
    { returnDocument: 'after' }
  );
  if (!move) return res.status(409).json({ success: false, message: 'This job was just taken or is no longer available.' });
  notify(move.userEmail, {
    type: 'driver',
    bookingId: move.bookingId,
    title: `${cap.name} is your Move Captain`,
    body: `${cap.captain?.vehicleType || 'Truck'} ${cap.captain?.vehicleNumber || ''} • ${cap.ratingCount ? `⭐ ${cap.rating}` : 'new Move Captain'}. You can chat or call from My Moves.`,
    email: true,
    sms: true
  });
  res.json({ success: true, job: captainView(move, cap.email) });
});

// POST /api/moves/captain/jobs/:bookingId/release — a captain who can't make it hands the job back
// (only before pickup). The customer is told, and the job goes back to the open pool.
router.post('/captain/jobs/:bookingId/release', requireApprovedCaptain, async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 300);
  const move = await MoveBooking.findOneAndUpdate(
    { bookingId: req.params.bookingId, assignedCaptainEmail: req.dbUser.email, status: 'assigned', pickupVerifiedAt: { $exists: false } },
    { $set: { status: 'confirmed', transitStatus: 'Finding a new Move Captain' }, $unset: { assignedCaptainEmail: 1, assignedAt: 1, loadedBoxes: 1, driverLocation: 1 } },
    { returnDocument: 'after' }
  );
  if (!move) return res.status(409).json({ success: false, message: 'You can only release a job you accepted, before pickup.' });
  notify(move.userEmail, {
    type: 'booking', bookingId: move.bookingId, email: true, sms: true,
    title: `Your Move Captain can't make ${move.bookingId}`,
    body: `We're finding you another verified captain for the same slot${reason ? ` (reason: ${reason})` : ''}. You can also reschedule or cancel for free from My Moves.`
  });
  res.json({ success: true });
});

// POST /api/moves/captain/jobs/:bookingId/boxes { boxId } — record a box scanned onto the truck.
// The customer sees the list in My Moves; boxes with a passport on this booking are marked as matched.
router.post('/captain/jobs/:bookingId/boxes', requireApprovedCaptain, async (req, res) => {
  const boxId = String(req.body.boxId || '').trim().toUpperCase().slice(0, 60);
  if (!/^[A-Z0-9][A-Z0-9-]{2,59}$/.test(boxId)) return res.status(400).json({ success: false, message: 'That doesn\'t look like a box ID.' });
  const move = await MoveBooking.findOne({ bookingId: req.params.bookingId, assignedCaptainEmail: req.dbUser.email });
  if (!move) return res.status(404).json({ success: false, message: 'This job isn\'t assigned to you.' });
  if (statusOf(move) !== 'assigned') return res.status(409).json({ success: false, message: 'Boxes are checked while loading, before pickup is verified.' });
  const list = move.loadedBoxes || [];
  if (list.some((b) => b.boxId === boxId)) return res.json({ success: true, duplicate: true, loadedBoxes: list });
  if (list.length >= 200) return res.status(409).json({ success: false, message: 'That\'s a lot of boxes — contact support.' });
  const passport = await LuggagePassport.findOne({ boxId, userEmail: move.userEmail }).select('label').lean();
  move.loadedBoxes = [...list, { boxId, at: new Date(), matched: !!passport, label: passport?.label }];
  await move.save();
  if (passport) await LuggagePassport.updateOne({ boxId }, { $set: { status: 'in_transit' } });
  res.json({ success: true, loadedBoxes: move.loadedBoxes });
});

const otpMatches = (given, expected) => {
  const a = Buffer.from(String(given || '').padEnd(6).slice(0, 6));
  const b = Buffer.from(String(expected || '').padEnd(6).slice(0, 6));
  return !!expected && /^\d{6}$/.test(String(given)) && crypto.timingSafeEqual(a, b);
};

// POST /api/moves/verify-otp — the captain enters the code the customer reads out
router.post('/verify-otp', requireApprovedCaptain, async (req, res) => {
  try {
    const capEmail = req.dbUser.email;
    const { bookingId, otp, stage } = req.body;
    if (!bookingId || !['pickup', 'delivery'].includes(stage)) {
      return res.status(400).json({ success: false, message: 'bookingId and a valid stage are required.' });
    }
    const move = await MoveBooking.findOne({ bookingId });
    if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (move.assignedCaptainEmail !== capEmail) {
      return res.status(403).json({ success: false, message: 'Accept this job before verifying codes.' });
    }
    if (move.otpLockedUntil && move.otpLockedUntil > new Date()) {
      const mins = Math.ceil((move.otpLockedUntil - Date.now()) / 60000);
      return res.status(429).json({ success: false, message: `Too many wrong codes. Try again in ${mins} min.` });
    }
    const st = statusOf(move);
    if (stage === 'pickup' && st !== 'assigned') {
      return res.status(409).json({ success: false, message: st === 'in_transit' ? 'Pickup is already verified.' : `Pickup isn't possible while the booking is ${st}.` });
    }
    if (stage === 'delivery' && st !== 'in_transit') {
      return res.status(409).json({ success: false, message: st === 'delivered' ? 'This move is already delivered.' : 'Verify pickup before delivery.' });
    }

    const expected = stage === 'pickup' ? move.pickupOtp : move.deliveryOtp;
    if (!otpMatches(otp, expected)) {
      move.otpFailedAttempts = (move.otpFailedAttempts || 0) + 1;
      const left = MAX_OTP_ATTEMPTS - move.otpFailedAttempts;
      if (left <= 0) {
        move.otpFailedAttempts = 0;
        move.otpLockedUntil = new Date(Date.now() + OTP_LOCK_MS);
      }
      await move.save();
      return res.status(400).json({
        success: false,
        message: left > 0 ? `Wrong ${stage} code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong codes. Locked for 15 minutes.'
      });
    }

    move.otpFailedAttempts = 0;
    move.otpLockedUntil = undefined;
    if (stage === 'pickup') {
      move.pickupVerifiedAt = new Date();
      move.status = 'in_transit';
      move.transitStatus = 'Picked up • On the way to your new home';
      move.escrowStatus = 'in_transit';
      notify(move.userEmail, { type: 'driver', bookingId, title: 'Your boxes are loaded and on the way 🚚', body: 'Track the truck live from My Moves. Keep your Delivery OTP ready.', sms: true });
    } else {
      // Claim the delivery atomically: two simultaneous correct codes must not pay the captain twice.
      const claim = await MoveBooking.updateOne({ _id: move._id, status: 'in_transit' }, { $set: { status: 'delivered', deliveredAt: new Date() } });
      if (!claim.modifiedCount) return res.status(409).json({ success: false, message: 'This move is already delivered.' });
      move.deliveredAt = new Date();
      move.status = 'delivered';
      move.transitStatus = 'Delivered';
      move.escrowStatus = 'released_to_captain';
      const payout = Math.round((move.priceBreakdown?.subtotal || move.paymentDetails?.amountPaid || 0) * (1 - PLATFORM_FEE_RATE));
      move.captainPayout = { amount: payout, creditedAt: new Date() };
      const boxIds = (move.loadedBoxes || []).filter((x) => x.matched).map((x) => x.boxId);
      if (boxIds.length) await LuggagePassport.updateMany({ boxId: { $in: boxIds }, userEmail: move.userEmail }, { $set: { status: 'delivered' } });
      await User.updateOne({ email: capEmail }, { $inc: { escrowWalletBalance: payout, tripsCompleted: 1 } });
      await recordPayout(move, capEmail, payout);
      notify(capEmail, { type: 'payment', bookingId, title: `₹${payout.toLocaleString('en-IN')} credited to your wallet`, body: `Payout for ${bookingId}.` });
      notify(move.userEmail, { type: 'booking', bookingId, title: 'Delivered! Welcome home 🏡', body: 'Rate your Move Captain, or raise a damage claim within 48 hours if anything is wrong.', email: true, sms: true });
    }
    await move.save();
    res.json({ success: true, message: `${stage === 'pickup' ? 'Pickup' : 'Delivery'} verified successfully!`, job: captainView(move, capEmail) });
  } catch {
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

// Used at startup: replace the old hard-coded codes shared by every booking.
export const rotateLegacyOtps = async () => {
  const legacy = await MoveBooking.find({ $or: [{ pickupOtp: '582941' }, { deliveryOtp: '910283' }] });
  for (const m of legacy) {
    m.pickupOtp = generateOtp();
    m.deliveryOtp = generateOtp();
    await m.save();
  }
  return legacy.length;
};

export default router;

// Used at startup: bookings created before real payments existed carried fake
// "paid" data. Reset them to honest drafts so nothing looks paid that wasn't.
export const migrateLegacyBookings = async () => {
  const r = await MoveBooking.collection.updateMany(
    { $or: [{ status: { $exists: false } }, { 'paymentDetails.status': { $nin: ['unpaid', 'paid', 'refunded', 'partially_refunded'] } }] },
    {
      $set: { status: 'draft', escrowStatus: 'pending', transitStatus: 'Draft estimate', 'paymentDetails.status': 'unpaid', 'paymentDetails.amountPaid': 0 },
      $unset: { 'paymentDetails.transactionId': '', 'paymentDetails.method': '', 'paymentDetails.paidAt': '', pickupVerifiedAt: '', deliveredAt: '', assignedCaptainEmail: '' }
    }
  );
  return r.modifiedCount;
};
