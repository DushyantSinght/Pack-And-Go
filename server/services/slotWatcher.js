// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Every few minutes, look for moves whose slot came and went without anyone acting, and tell the
// people who can fix it. Each booking is alerted once per slot (rescheduling resets the flags).
import { MoveBooking, User } from '../models/index.js';
import { notify } from './notify.js';

const EVERY_MS = 5 * 60_000;
const NO_CAPTAIN_AFTER_MS = 30 * 60_000; // slot started 30 min ago and still nobody accepted
const NO_PICKUP_AFTER_MS = 3 * 3_600_000; // slot over, captain assigned, pickup never verified
const LOOKBACK_MS = 2 * 86_400_000; // ignore very old bookings (no surprise alerts after downtime)

const admins = () => User.find({ isAdmin: true }).select('_id email').lean();

/** `only` limits the check to some booking IDs (used by the tests). */
export const checkMissedSlots = async ({ now = Date.now(), only } = {}) => {
  const since = new Date(now - LOOKBACK_MS);
  const scope = only ? { bookingId: { $in: only } } : {};
  let sent = 0;

  const noCaptain = await MoveBooking.find({
    ...scope,
    status: 'confirmed',
    $or: [{ assignedCaptainEmail: { $exists: false } }, { assignedCaptainEmail: null }],
    moveDate: { $gte: since, $lte: new Date(now - NO_CAPTAIN_AFTER_MS) },
    missedSlotAlertAt: { $exists: false }
  }).limit(100);

  const noPickup = await MoveBooking.find({
    ...scope,
    status: 'assigned',
    pickupVerifiedAt: { $exists: false },
    moveDate: { $gte: since, $lte: new Date(now - NO_PICKUP_AFTER_MS) },
    overduePickupAlertAt: { $exists: false }
  }).limit(100);

  if (!noCaptain.length && !noPickup.length) return 0;
  const staff = await admins();

  for (const m of noCaptain) {
    // Claim the alert first so two server instances never both send it.
    const claimed = await MoveBooking.updateOne({ _id: m._id, missedSlotAlertAt: { $exists: false } }, { $set: { missedSlotAlertAt: new Date() } });
    if (!claimed.modifiedCount) continue;
    notify(m.userEmail, {
      type: 'booking', bookingId: m.bookingId, email: true, sms: true,
      title: `No Move Captain took ${m.bookingId} yet`,
      body: "Sorry — nobody has accepted your slot. Open My Moves to pick a new time for free, or cancel for a full refund."
    });
    staff.forEach((a) => notify(a, { type: 'booking', bookingId: m.bookingId, title: `Ops: ${m.bookingId} has no captain`, body: `Slot started ${new Date(m.moveDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Customer was told they can reschedule or cancel.` }));
    sent += 1;
  }

  for (const m of noPickup) {
    const claimed = await MoveBooking.updateOne({ _id: m._id, overduePickupAlertAt: { $exists: false } }, { $set: { overduePickupAlertAt: new Date() } });
    if (!claimed.modifiedCount) continue;
    notify(m.userEmail, {
      type: 'booking', bookingId: m.bookingId, email: true, sms: true,
      title: `Pickup for ${m.bookingId} hasn't happened`,
      body: "Your slot has ended and pickup wasn't confirmed. Call or chat with your captain from My Moves — if they didn't turn up, contact support for a full refund."
    });
    if (m.assignedCaptainEmail) notify(m.assignedCaptainEmail, { type: 'driver', bookingId: m.bookingId, sms: true, title: `Job ${m.bookingId} is overdue`, body: 'The slot has ended and pickup is not verified. Contact the customer or Pack&Go ops now.' });
    staff.forEach((a) => notify(a, { type: 'booking', bookingId: m.bookingId, title: `Ops: pickup overdue on ${m.bookingId}`, body: `Captain ${m.assignedCaptainEmail || '—'}. Customer and captain were alerted.` }));
    sent += 1;
  }
  return sent;
};

export const startSlotWatcher = () => {
  const run = () => checkMissedSlots().then((n) => n && console.log(`⏰ Sent ${n} missed-slot alert(s).`)).catch((e) => console.warn('Slot watcher:', e.message));
  setTimeout(run, 15_000);
  return setInterval(run, EVERY_MS);
};
