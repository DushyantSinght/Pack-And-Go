// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import mongoose from 'mongoose';
import { User, MoveBooking, DamageClaim, ServiceRequest, PaymentTransaction, MarketplaceItem } from '../models/index.js';
import { refund, recordCompensation, DEMO_NOTICE } from '../services/payments.js';
import { notify } from '../services/notify.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, isAdminUser, profileOf } from '../middleware/roles.js';
import { emitToUsers, disconnectUser } from '../socket.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

/** Full application view for staff (includes licence number). */
const applicationOf = (u) => ({
  _id: String(u._id),
  name: u.name,
  email: u.email,
  phone: u.phone || null,
  avatar: u.avatar,
  status: u.captain?.status || 'pending',
  licenseNumber: u.captain?.licenseNumber || null,
  vehicleNumber: u.captain?.vehicleNumber || null,
  vehicleType: u.captain?.vehicleType || null,
  appliedAt: u.captain?.appliedAt || u.createdAt,
  reviewedAt: u.captain?.reviewedAt || null,
  reviewedBy: u.captain?.reviewedBy || null,
  reviewNote: u.captain?.reviewNote || null,
  tripsCompleted: u.tripsCompleted,
  rating: u.rating
});

/** Ping every online admin so their approvals queue updates live. */
export const notifyAdminsOfApplication = async (applicant) => {
  const admins = await User.find({ isAdmin: true }).select('_id').lean();
  emitToUsers(admins.map((a) => String(a._id)), 'admin:captain-application', applicationOf(applicant));
};

// GET /api/admin/captains?status=pending — review queue
router.get('/captains', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userType: 'captain' };
    if (STATUSES.includes(status)) {
      // Older captain accounts have no status yet — treat them as pending.
      filter.$or = status === 'pending'
        ? [{ 'captain.status': 'pending' }, { 'captain.status': { $exists: false } }, { 'captain.status': 'none' }]
        : [{ 'captain.status': status }];
    }
    const users = await User.find(filter).sort({ 'captain.appliedAt': -1, createdAt: -1 }).limit(100);
    const counts = await User.aggregate([
      { $match: { userType: 'captain' } },
      { $group: { _id: { $ifNull: ['$captain.status', 'pending'] }, n: { $sum: 1 } } }
    ]);
    const tally = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const c of counts) tally[c._id === 'none' ? 'pending' : c._id] = (tally[c._id === 'none' ? 'pending' : c._id] || 0) + c.n;
    res.json({ success: true, counts: tally, captains: users.map(applicationOf) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load applications.' });
  }
});

// POST /api/admin/captains/:id/review — { action: approve | reject | suspend, note }
router.post('/captains/:id/review', async (req, res) => {
  try {
    const { action, note } = req.body;
    const nextStatus = { approve: 'approved', reject: 'rejected', suspend: 'suspended' }[action];
    if (!nextStatus) return res.status(400).json({ success: false, message: 'action must be approve, reject or suspend.' });
    if ((action === 'reject' || action === 'suspend') && !String(note || '').trim()) {
      return res.status(400).json({ success: false, message: 'Please give the driver a reason.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Applicant not found.' });

    const user = await User.findOne({ _id: req.params.id, userType: 'captain' });
    if (!user) return res.status(404).json({ success: false, message: 'Applicant not found.' });
    if (String(user._id) === String(req.user._id) || isAdminUser(user)) {
      return res.status(400).json({ success: false, message: "Admins can't review their own captain account." });
    }

    user.captain = {
      ...(user.captain?.toObject?.() || user.captain || {}),
      status: nextStatus,
      reviewedAt: new Date(),
      reviewedBy: req.user.email,
      reviewNote: String(note || '').trim().slice(0, 500) || undefined
    };
    await user.save();

    // Tell the driver right away if they're online.
    emitToUsers([String(user._id)], 'account:updated', { user: profileOf(user) });

    res.json({ success: true, captain: applicationOf(user) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not save the review.' });
  }
});

// ── Bookings oversight ───────────────────────────────────────────
router.get('/bookings', async (req, res) => {
  const filter = { status: { $ne: 'draft' } };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const moves = await MoveBooking.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const counts = await MoveBooking.aggregate([{ $match: { status: { $ne: 'draft' } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  res.json({
    success: true,
    counts: Object.fromEntries(counts.map((c) => [c._id || 'unknown', c.n])),
    bookings: moves.map((m) => ({
      bookingId: m.bookingId, status: m.status, userName: m.userName, userEmail: m.userEmail, userPhone: m.userPhone,
      origin: m.origin, destination: m.destination, moveDate: m.moveDate, timeSlot: m.timeSlot, distanceKm: m.distanceKm,
      total: m.priceBreakdown?.total, payment: m.paymentDetails, captain: m.assignedCaptainEmail, review: m.review,
      createdAt: m.createdAt
    }))
  });
});

// ── Simulated transactions ledger ────────────────────────────────
// GET /api/admin/transactions?kind=payment|refund|payout&status=success|failed&q=<bookingId or email>
router.get('/transactions', async (req, res) => {
  const filter = {};
  if (['payment', 'refund', 'payout', 'compensation'].includes(req.query.kind)) filter.kind = req.query.kind;
  if (['success', 'failed'].includes(req.query.status)) filter.status = req.query.status;
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ bookingId: rx }, { userEmail: rx }, { txnId: rx }];
  }
  const [rows, totals] = await Promise.all([
    PaymentTransaction.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
    PaymentTransaction.aggregate([{ $group: { _id: { kind: '$kind', status: '$status' }, n: { $sum: 1 }, amount: { $sum: '$amount' } } }])
  ]);
  const refundByBooking = new Map();
  for (const r of rows) if (r.kind === 'refund' && r.status === 'success') refundByBooking.set(r.bookingId, (refundByBooking.get(r.bookingId) || 0) + r.amount);
  res.json({
    success: true,
    simulated: true,
    notice: DEMO_NOTICE,
    totals: totals.map((t) => ({ kind: t._id.kind, status: t._id.status, count: t.n, amount: t.amount })),
    transactions: rows.map((t) => ({
      txnId: t.txnId, kind: t.kind, status: t.status, bookingId: t.bookingId, userEmail: t.userEmail, amount: t.amount,
      method: t.method, reason: t.reason || null, relatedTxnId: t.relatedTxnId || null, createdAt: t.createdAt, simulated: true,
      refundedAmount: t.kind === 'payment' && t.status === 'success' ? refundByBooking.get(t.bookingId) || 0 : undefined
    }))
  });
});

// POST /api/admin/bookings/:bookingId/cancel { reason } — staff cancel with a full refund
router.post('/bookings/:bookingId/cancel', async (req, res) => {
  try {
    if (!String(req.body.reason || '').trim()) return res.status(400).json({ success: false, message: 'Give a reason.' });
    const move = await MoveBooking.findOne({ bookingId: req.params.bookingId });
    if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (['delivered', 'cancelled'].includes(move.status)) return res.status(409).json({ success: false, message: `Booking is ${move.status}.` });
    const paid = move.paymentDetails?.status === 'paid' ? move.paymentDetails.amountPaid : 0;
    const before = move.status;
    const claimed = await MoveBooking.updateOne({ _id: move._id, status: before }, { $set: { status: 'cancelled', transitStatus: 'Cancelled by Pack&Go' } });
    if (!claimed.modifiedCount) return res.status(409).json({ success: false, message: 'This booking was just updated — refresh and try again.' });
    try {
      if (paid) await refund(move, paid, req.body.reason);
    } catch (e) {
      await MoveBooking.updateOne({ _id: move._id }, { $set: { status: before } });
      throw e;
    }
    move.status = 'cancelled';
    move.transitStatus = 'Cancelled by Pack&Go';
    move.cancellation = { at: new Date(), reason: req.body.reason, refundPercent: 100, by: req.user.email };
    await move.save();
    notify(move.userEmail, { type: 'booking', bookingId: move.bookingId, title: `Booking ${move.bookingId} was cancelled by Pack&Go`, body: `${req.body.reason}${paid ? ` A full simulated refund of ₹${paid.toLocaleString('en-IN')} has been recorded (academic demo, no real money).` : ''}`, email: true, sms: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Damage claims ────────────────────────────────────────────────
router.get('/claims', async (req, res) => {
  const filter = req.query.status && req.query.status !== 'all' ? { status: req.query.status } : {};
  const claims = await DamageClaim.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, claims });
});

router.post('/claims/:claimId/resolve', async (req, res) => {
  const { status, amountApproved, note } = req.body;
  if (!['under_review', 'approved', 'rejected', 'paid'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
  if (status !== 'under_review' && !String(note || '').trim()) return res.status(400).json({ success: false, message: 'Add a note for the customer.' });
  const amount = Math.max(0, Math.min(200000, Math.round(Number(amountApproved) || 0)));
  if (status === 'approved' && amount <= 0) return res.status(400).json({ success: false, message: 'Enter the approved amount.' });
  // Decisions only move forward, atomically — approving twice can never pay twice.
  const FROM = { under_review: ['open'], approved: ['open', 'under_review'], rejected: ['open', 'under_review'], paid: ['approved'] };
  const claim = await DamageClaim.findOneAndUpdate(
    { claimId: req.params.claimId, status: { $in: FROM[status] } },
    // Only approval sets the amount; later steps (paid) keep it.
    { $set: { status, 'resolution.note': note, 'resolution.by': req.user.email, 'resolution.at': new Date(), ...(status === 'approved' && { 'resolution.amountApproved': amount }) } },
    { returnDocument: 'after' }
  );
  if (!claim) {
    const exists = await DamageClaim.exists({ claimId: req.params.claimId });
    return res.status(exists ? 409 : 404).json({ success: false, message: exists ? 'This claim was already decided — refresh to see its status.' : 'Claim not found.' });
  }
  if (status === 'approved') await recordCompensation(claim, amount);
  notify(claim.userEmail, {
    type: 'claim', bookingId: claim.bookingId,
    title: `Claim ${claim.claimId}: ${status.replace('_', ' ')}`,
    body: [note, status === 'approved' || status === 'paid' ? `Approved amount: ₹${(claim.resolution?.amountApproved || 0).toLocaleString('en-IN')} (simulated — no real money)` : ''].filter(Boolean).join(' • '),
    email: true
  });
  res.json({ success: true, claim: { ...claim.toObject(), photos: undefined } });
});

// ── Service requests ─────────────────────────────────────────────
router.get('/requests', async (req, res) => {
  const filter = req.query.status && req.query.status !== 'all' ? { status: req.query.status } : {};
  const requests = await ServiceRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, requests });
});

router.post('/requests/:requestId/status', async (req, res) => {
  const { status, note } = req.body;
  if (!['confirmed', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
  const r = await ServiceRequest.findOneAndUpdate({ requestId: req.params.requestId }, { $set: { status, staffNote: note } }, { returnDocument: 'after' });
  if (!r) return res.status(404).json({ success: false, message: 'Request not found.' });
  notify(r.userEmail, { type: 'info', title: `${r.title}: ${status}`, body: note || undefined, sms: status === 'confirmed' });
  res.json({ success: true, request: r });
});

// ── Moderation: users ────────────────────────────────────────────
const escapeRe = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const userRow = (u) => ({
  _id: String(u._id),
  name: u.name,
  email: u.email,
  phone: u.phone || null,
  userType: u.userType,
  isAdmin: !!u.isAdmin,
  emailVerified: !!u.emailVerified,
  isBlocked: !!u.isBlocked,
  blocked: u.isBlocked ? u.blocked || null : null,
  createdAt: u.createdAt
});

// GET /api/admin/users?q=&filter=all|blocked|captain|customer — newest first, max 100
router.get('/users', async (req, res) => {
  const filter = {};
  if (req.query.filter === 'blocked') filter.isBlocked = true;
  if (req.query.filter === 'captain') filter.userType = 'captain';
  if (req.query.filter === 'customer') filter.userType = { $ne: 'captain' };
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) filter.$or = [{ name: new RegExp(escapeRe(q), 'i') }, { email: new RegExp(escapeRe(q), 'i') }, { phone: new RegExp(escapeRe(q.replace(/\D/g, '') || q)) }];
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, users: users.map(userRow) });
});

// POST /api/admin/users/:id/block { reason } — can't sign in; every open session ends now
router.post('/users/:id/block', async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 300);
  if (!reason) return res.status(400).json({ success: false, message: 'Give a reason.' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'User not found.' });
  const target = await User.findById(req.params.id).lean();
  if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
  if (isAdminUser(target)) return res.status(403).json({ success: false, message: 'The admin account cannot be blocked.' });
  const u = await User.findOneAndUpdate(
    { _id: target._id, isBlocked: { $ne: true } },
    { $set: { isBlocked: true, blocked: { reason, at: new Date(), by: req.user.email } }, $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' }
  );
  if (!u) return res.status(409).json({ success: false, message: 'This user is already blocked.' });
  disconnectUser(String(u._id)); // live chat/calls end now, not at the next reconnect
  res.json({ success: true, user: userRow(u) });
});

// POST /api/admin/users/:id/unblock
router.post('/users/:id/unblock', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'User not found.' });
  const u = await User.findOneAndUpdate({ _id: req.params.id, isBlocked: true }, { $set: { isBlocked: false }, $unset: { blocked: '' } }, { returnDocument: 'after' });
  if (!u) return res.status(404).json({ success: false, message: 'User not found or not blocked.' });
  notify(u, { type: 'account', title: 'Your account is active again', body: 'You can sign in to Pack&Go again.', email: true });
  res.json({ success: true, user: userRow(u) });
});

// ── Moderation: marketplace listings ─────────────────────────────
const listingRow = (i) => ({
  itemId: i.itemId,
  title: i.title,
  price: i.price,
  category: i.category,
  society: i.society,
  imageUrl: i.imageUrl,
  status: i.status,
  seller: { name: i.seller?.name, email: i.seller?.email || null },
  moderation: i.status === 'removed' ? i.moderation || null : null,
  createdAt: i.createdAt
});

// GET /api/admin/listings?status=all|available|claimed|sold|removed&q=
router.get('/listings', async (req, res) => {
  const filter = {};
  if (['available', 'claimed', 'sold', 'removed'].includes(req.query.status)) filter.status = req.query.status;
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) filter.$or = [{ title: new RegExp(escapeRe(q), 'i') }, { itemId: new RegExp(escapeRe(q), 'i') }, { 'seller.email': new RegExp(escapeRe(q), 'i') }];
  const items = await MarketplaceItem.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, listings: items.map(listingRow) });
});

// POST /api/admin/listings/:itemId/remove { reason } — hidden from the marketplace (not deleted)
router.post('/listings/:itemId/remove', async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 300);
  if (!reason) return res.status(400).json({ success: false, message: 'Give a reason.' });
  const item = await MarketplaceItem.findOne({ itemId: String(req.params.itemId) });
  if (!item) return res.status(404).json({ success: false, message: 'Listing not found.' });
  const updated = await MarketplaceItem.findOneAndUpdate(
    { _id: item._id, status: { $ne: 'removed' } },
    { $set: { status: 'removed', moderation: { reason, by: req.user.email, at: new Date(), previousStatus: item.status } } },
    { returnDocument: 'after' }
  );
  if (!updated) return res.status(409).json({ success: false, message: 'This listing is already removed.' });
  if (item.seller?.email) {
    notify(item.seller.email, { type: 'marketplace', title: `Your listing "${item.title}" was removed`, body: `Reason: ${reason}`, email: true });
  }
  res.json({ success: true, listing: listingRow(updated) });
});

// POST /api/admin/listings/:itemId/restore — back to the status it had before removal
router.post('/listings/:itemId/restore', async (req, res) => {
  const item = await MarketplaceItem.findOne({ itemId: String(req.params.itemId), status: 'removed' });
  if (!item) return res.status(404).json({ success: false, message: 'Listing not found or not removed.' });
  const back = ['available', 'claimed', 'sold'].includes(item.moderation?.previousStatus) ? item.moderation.previousStatus : 'available';
  const updated = await MarketplaceItem.findOneAndUpdate({ _id: item._id, status: 'removed' }, { $set: { status: back }, $unset: { moderation: '' } }, { returnDocument: 'after' });
  if (!updated) return res.status(409).json({ success: false, message: 'This listing was just changed — refresh and try again.' });
  if (item.seller?.email) notify(item.seller.email, { type: 'marketplace', title: `Your listing "${item.title}" is back`, body: 'Pack&Go restored it to the marketplace.' });
  res.json({ success: true, listing: listingRow(updated) });
});

export default router;
