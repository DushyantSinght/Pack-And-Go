// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// SIMULATED payments — Pack&Go is an academic project and never processes real money.
// Everything a real flow needs is still enforced on the server: the amount comes from the booking,
// only the owner can pay, a booking can be paid once, refunded once and paid out once, and every
// movement is written to the PaymentTransaction ledger with a unique reference.
// NOT suitable for commercial financial transactions.
import crypto from 'crypto';
import { notify } from './notify.js';
import { MoveBooking, PaymentTransaction } from '../models/index.js';

export const DEMO_NOTICE = 'Academic Demo — No Real Money Involved.';

/** Demo payments are ON unless DEMO_PAYMENTS_ENABLED=false (works in production too — it's the only method). */
export const demoPaymentsEnabled = () => String(process.env.DEMO_PAYMENTS_ENABLED ?? 'true').toLowerCase().trim() !== 'false';

/** Unique, unguessable reference such as DEMO-PAY-7F3A9C21B4E0. */
export const newTxnId = (kind) => `DEMO-${{ payment: 'PAY', refund: 'RFND', payout: 'PAYOUT' }[kind]}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

const ledger = (row) =>
  PaymentTransaction.create({ ...row, simulated: true }).catch((err) => {
    // The booking change already happened atomically; a missing ledger row must be visible, not silent.
    console.error(`ledger write failed for ${row.txnId} (${row.kind} ${row.bookingId}):`, err.message);
    return null;
  });

/** Record a declined demo payment. The booking is left untouched (still awaiting payment). */
export const recordFailedPayment = async (booking, { amount, method, reason }) => {
  const txnId = newTxnId('payment');
  await ledger({ txnId, kind: 'payment', status: 'failed', bookingId: booking.bookingId, userEmail: booking.userEmail, amount, method, reason });
  notify(booking.userEmail, { type: 'payment', bookingId: booking.bookingId, title: 'Payment failed (simulated)', body: `${reason} No money was taken. You can try again from My Moves.` });
  return txnId;
};

/**
 * Mark a booking paid and record it. Atomic: of two simultaneous requests only one flips the
 * booking to paid. Returns { booking, txnId }, or null if it was already paid (double click).
 */
export const markPaid = async (booking, { amount, method }) => {
  if (booking.paymentDetails?.status === 'paid') return null;
  const txnId = newTxnId('payment');
  const set = {
    'paymentDetails.status': 'paid',
    'paymentDetails.method': method === 'demo_upi' ? 'Simulated UPI' : 'Simulated card',
    'paymentDetails.transactionId': txnId,
    'paymentDetails.amountPaid': amount,
    'paymentDetails.paidAt': new Date(),
    'paymentDetails.testMode': true, // = simulated
    escrowStatus: 'escrow_locked',
    transitStatus: 'Booking confirmed • Finding your Move Captain',
    ...(['draft', 'pending_payment'].includes(booking.status) && { status: 'confirmed' })
  };
  const updated = await MoveBooking.findOneAndUpdate(
    { _id: booking._id, 'paymentDetails.status': { $ne: 'paid' }, status: 'pending_payment' },
    { $set: set },
    { returnDocument: 'after' }
  );
  if (!updated) return null;
  booking.set(updated.toObject());
  await ledger({ txnId, kind: 'payment', status: 'success', bookingId: booking.bookingId, userEmail: booking.userEmail, amount, method });
  const when = booking.moveDate ? new Date(booking.moveDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '';
  notify(booking.userEmail, {
    type: 'payment',
    bookingId: booking.bookingId,
    title: `Booking ${booking.bookingId} confirmed`,
    body: `Simulated payment of ₹${amount.toLocaleString('en-IN')} recorded (ref ${txnId}) and held until delivery. Move on ${when}. We'll tell you when your Move Captain is assigned. ${DEMO_NOTICE}`,
    email: true,
    sms: true
  });
  return { booking, txnId };
};

/**
 * Refund `amountRupees` of a paid booking. Callers claim the cancellation atomically first, so this
 * runs once per booking; the status guard below makes a second refund impossible regardless.
 */
export const refund = async (booking, amountRupees, reason) => {
  const pd = booking.paymentDetails || {};
  if (pd.status !== 'paid' || amountRupees <= 0) return { refunded: 0 };
  const amount = Math.min(amountRupees, pd.amountPaid || 0);
  const refundId = newTxnId('refund');
  const status = amount >= (pd.amountPaid || 0) ? 'refunded' : 'partially_refunded';
  const r = await MoveBooking.updateOne(
    { _id: booking._id, 'paymentDetails.status': 'paid' },
    { $set: { 'paymentDetails.status': status, 'paymentDetails.refundId': refundId, 'paymentDetails.refundAmount': amount, 'paymentDetails.refundedAt': new Date(), escrowStatus: 'refunded' } }
  );
  if (!r.modifiedCount) return { refunded: 0 }; // already refunded
  booking.paymentDetails = { ...(pd.toObject?.() || pd), status, refundId, refundAmount: amount, refundedAt: new Date() };
  booking.escrowStatus = 'refunded';
  await ledger({ txnId: refundId, kind: 'refund', status: 'success', bookingId: booking.bookingId, userEmail: booking.userEmail, amount, method: 'system', reason: String(reason || '').slice(0, 300), relatedTxnId: pd.transactionId });
  return { refunded: amount, refundId };
};

/** Record the captain's payout (called once, after the delivery OTP is verified). */
export const recordPayout = (booking, captainEmail, amount) => {
  const txnId = newTxnId('payout');
  return ledger({ txnId, kind: 'payout', status: 'success', bookingId: booking.bookingId, userEmail: captainEmail, amount, method: 'system', relatedTxnId: booking.paymentDetails?.transactionId }).then(() => txnId);
};
