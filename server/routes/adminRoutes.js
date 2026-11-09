// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import mongoose from 'mongoose';
import { User, MoveBooking, DamageClaim, ServiceRequest } from '../models/index.js';
import { refund } from '../services/payments.js';
import { notify } from '../services/notify.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, isAdminUser, profileOf } from '../middleware/roles.js';
import { emitToUsers } from '../socket.js';

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
  const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const admins = await User.find({ $or: [{ isAdmin: true }, { email: { $in: envAdmins } }] }).select('_id').lean();
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

// POST /api/admin/bookings/:bookingId/cancel { reason } — staff cancel with a full refund
router.post('/bookings/:bookingId/cancel', async (req, res) => {
  try {
    if (!String(req.body.reason || '').trim()) return res.status(400).json({ success: false, message: 'Give a reason.' });
    const move = await MoveBooking.findOne({ bookingId: req.params.bookingId });
    if (!move) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (['delivered', 'cancelled'].includes(move.status)) return res.status(409).json({ success: false, message: `Booking is ${move.status}.` });
    const paid = move.paymentDetails?.status === 'paid' ? move.paymentDetails.amountPaid : 0;
    if (paid) await refund(move, paid, req.body.reason);
    move.status = 'cancelled';
    move.transitStatus = 'Cancelled by Pack&Go';
    move.cancellation = { at: new Date(), reason: req.body.reason, refundPercent: 100, by: req.user.email };
    await move.save();
    notify(move.userEmail, { type: 'booking', bookingId: move.bookingId, title: `Booking ${move.bookingId} was cancelled by Pack&Go`, body: `${req.body.reason}${paid ? ` A full refund of ₹${paid.toLocaleString('en-IN')} is on its way.` : ''}`, email: true, sms: true });
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
  const claim = await DamageClaim.findOneAndUpdate(
    { claimId: req.params.claimId },
    { $set: { status, resolution: { note, amountApproved: Number(amountApproved) || 0, by: req.user.email, at: new Date() } } },
    { returnDocument: 'after' }
  );
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });
  notify(claim.userEmail, {
    type: 'claim', bookingId: claim.bookingId,
    title: `Claim ${claim.claimId}: ${status.replace('_', ' ')}`,
    body: [note, status === 'approved' || status === 'paid' ? `Approved amount: ₹${(Number(amountApproved) || 0).toLocaleString('en-IN')}` : ''].filter(Boolean).join(' • '),
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

export default router;
