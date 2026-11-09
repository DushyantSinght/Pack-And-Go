// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import crypto from 'crypto';
import express from 'express';
import { MoveBooking } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getRazorpay, razorpayConfigured, testPaymentsAllowed, markPaid } from '../services/payments.js';
import { notify } from '../services/notify.js';

const router = express.Router();

const safeEqualHex = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** The amount is always taken from the booking — never from the client. */
const payableBooking = async (bookingId, email) => {
  const booking = await MoveBooking.findOne({ bookingId, userEmail: email });
  if (!booking) return { error: [404, 'Booking not found.'] };
  if (booking.paymentDetails?.status === 'paid') return { error: [409, 'This booking is already paid.'] };
  if (booking.status !== 'pending_payment') return { error: [409, 'This booking is not awaiting payment.'] };
  const total = booking.priceBreakdown?.total;
  if (!total || total < 1) return { error: [409, 'This booking has no confirmed price yet.'] };
  if (booking.moveDate && booking.moveDate.getTime() < Date.now()) return { error: [409, 'This slot has passed. Reschedule before paying.'] };
  return { booking, total };
};

// GET /api/payments/config — which payment options exist right now
router.get('/config', (req, res) => {
  res.json({ success: true, razorpay: razorpayConfigured(), key: process.env.RAZORPAY_KEY_ID || null, testPayments: testPaymentsAllowed() });
});

// POST /api/payments/create-order { bookingId } — Razorpay order for the booking's server-side total
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    if (!razorpayConfigured()) {
      return res.status(503).json({ success: false, message: 'Online payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env.' });
    }
    const { booking, total, error } = await payableBooking(req.body.bookingId, req.user.email);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });

    const order = await getRazorpay().orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: booking.bookingId,
      notes: { bookingId: booking.bookingId, userEmail: req.user.email }
    });
    booking.paymentDetails = { ...(booking.paymentDetails?.toObject?.() || {}), razorpayOrderId: order.id, status: 'unpaid' };
    await booking.save();
    res.json({ success: true, order: { id: order.id, amount: order.amount, currency: order.currency }, key: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('create-order error', error);
    res.status(502).json({ success: false, message: error?.error?.description || 'Payment gateway error. Please try again.' });
  }
});

// POST /api/payments/verify — checkout handler posts the signed result here
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment identifiers.' });
    }
    const booking = await MoveBooking.findOne({ bookingId, userEmail: req.user.email });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.paymentDetails?.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'This payment does not belong to this booking.' });
    }
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (!safeEqualHex(expected, razorpay_signature)) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }
    await markPaid(booking, { method: 'Razorpay', paymentId: razorpay_payment_id, orderId: razorpay_order_id, amount: booking.priceBreakdown.total });
    res.json({ success: true, message: 'Payment verified. Your move is confirmed!', booking });
  } catch (error) {
    console.error('verify error', error);
    res.status(500).json({ success: false, message: 'Could not verify payment.' });
  }
});

// POST /api/payments/test-pay { bookingId } — development only, when no gateway keys are set
router.post('/test-pay', requireAuth, async (req, res) => {
  if (!testPaymentsAllowed()) return res.status(403).json({ success: false, message: 'Test payments are disabled.' });
  const { booking, total, error } = await payableBooking(req.body.bookingId, req.user.email);
  if (error) return res.status(error[0]).json({ success: false, message: error[1] });
  await markPaid(booking, { method: 'Test payment (dev)', paymentId: `TEST-${Date.now()}`, amount: total, testMode: true });
  res.json({ success: true, message: 'Test payment recorded. No real money was charged.', booking });
});

// GET /api/payments/status/:bookingId — my booking's payment state
router.get('/status/:bookingId', requireAuth, async (req, res) => {
  const booking = await MoveBooking.findOne({ bookingId: req.params.bookingId, userEmail: req.user.email });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true, status: booking.status, escrowStatus: booking.escrowStatus, paymentDetails: booking.paymentDetails });
});

/**
 * POST /api/payments/webhook — Razorpay server-to-server events.
 * Catches payments whose browser tab closed before /verify ran, and refunds.
 * Mounted in server.js with express.raw() so the signature covers the exact body.
 */
export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'Webhook secret not configured.' });
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!safeEqualHex(expected, req.get('x-razorpay-signature'))) return res.status(400).json({ success: false });

  try {
    const event = JSON.parse(req.body.toString('utf8'));
    const payment = event.payload?.payment?.entity;
    if (['payment.captured', 'order.paid'].includes(event.event) && payment) {
      const booking = await MoveBooking.findOne({ 'paymentDetails.razorpayOrderId': payment.order_id });
      if (booking && booking.paymentDetails?.status !== 'paid' && payment.amount === Math.round((booking.priceBreakdown?.total || 0) * 100)) {
        await markPaid(booking, { method: `Razorpay (${payment.method})`, paymentId: payment.id, orderId: payment.order_id, amount: payment.amount / 100 });
      }
    }
    if (event.event === 'payment.failed' && payment) {
      const booking = await MoveBooking.findOne({ 'paymentDetails.razorpayOrderId': payment.order_id });
      if (booking) notify(booking.userEmail, { type: 'payment', bookingId: booking.bookingId, title: 'Payment failed', body: payment.error_description || 'Please try again from My Moves.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('webhook error', err);
    res.status(500).json({ success: false });
  }
};

export default router;
