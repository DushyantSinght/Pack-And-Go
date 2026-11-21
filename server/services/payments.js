// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import Razorpay from 'razorpay';
import { notify } from './notify.js';
import { MoveBooking } from '../models/index.js';

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const getRazorpay = () =>
  razorpayConfigured() ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) : null;

/** Test payments are only possible in development without real gateway keys. */
export const testPaymentsAllowed = () => process.env.NODE_ENV !== 'production' && !razorpayConfigured();

/** Mark a booking paid (idempotent) and tell the customer. */
// Returns the updated booking, or null if it was already paid (e.g. a double click, or the webhook won).
export const markPaid = async (booking, { method, paymentId, orderId, amount, testMode = false }) => {
  if (booking.paymentDetails?.status === 'paid') return null;
  const set = {
    'paymentDetails.status': 'paid',
    'paymentDetails.method': method,
    'paymentDetails.transactionId': paymentId,
    'paymentDetails.razorpayOrderId': orderId || booking.paymentDetails?.razorpayOrderId,
    'paymentDetails.amountPaid': amount,
    'paymentDetails.paidAt': new Date(),
    'paymentDetails.testMode': testMode,
    escrowStatus: 'escrow_locked',
    transitStatus: 'Booking confirmed • Finding your Move Captain',
    ...(['draft', 'pending_payment'].includes(booking.status) && { status: 'confirmed' })
  };
  // Atomic: of two simultaneous confirmations only one flips the booking to paid (no double charge record).
  const updated = await MoveBooking.findOneAndUpdate({ _id: booking._id, 'paymentDetails.status': { $ne: 'paid' } }, { $set: set }, { returnDocument: 'after' });
  if (!updated) return null;
  booking.set(updated.toObject());
  const when = booking.moveDate ? new Date(booking.moveDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '';
  notify(booking.userEmail, {
    type: 'payment',
    bookingId: booking.bookingId,
    title: `Booking ${booking.bookingId} confirmed`,
    body: `₹${amount.toLocaleString('en-IN')} received and held in escrow. Move on ${when}. We'll text you when your Move Captain is assigned.`,
    email: true,
    sms: true
  });
  return booking;
};

/** Refund `amountRupees` of a paid booking through the gateway that took it. */
export const refund = async (booking, amountRupees, reason) => {
  const pd = booking.paymentDetails || {};
  if (pd.status !== 'paid' || amountRupees <= 0) return { refunded: 0 };
  let refundId = `TEST-RFND-${Date.now()}`;
  if (!pd.testMode) {
    const rp = getRazorpay();
    if (!rp) throw new Error('Payment gateway is not configured, cannot refund automatically.');
    const r = await rp.payments.refund(pd.transactionId, {
      amount: Math.round(amountRupees * 100),
      notes: { bookingId: booking.bookingId, reason: String(reason || '').slice(0, 200) }
    });
    refundId = r.id;
  }
  booking.paymentDetails = {
    ...(pd.toObject?.() || pd),
    status: amountRupees >= (pd.amountPaid || 0) ? 'refunded' : 'partially_refunded',
    refundId,
    refundAmount: amountRupees,
    refundedAt: new Date()
  };
  booking.escrowStatus = 'refunded';
  return { refunded: amountRupees, refundId };
};
