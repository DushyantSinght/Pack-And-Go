// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// SIMULATED payments only (academic demo). No card/UPI details are ever collected and no gateway is called.
import express from 'express';
import { MoveBooking, PaymentTransaction } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { DEMO_NOTICE, demoPaymentsEnabled, markPaid, recordFailedPayment } from '../services/payments.js';

const router = express.Router();

const METHODS = ['demo_card', 'demo_upi'];
const OUTCOMES = ['success', 'failure'];
const DECLINE_REASON = 'Simulated decline: the demo bank refused this payment.';

/** The amount is always taken from the booking — never from the client. */
const payableBooking = async (bookingId, email) => {
  if (typeof bookingId !== 'string' || !bookingId) return { error: [400, 'bookingId is required.'] };
  const booking = await MoveBooking.findOne({ bookingId, userEmail: email }); // ownership: only your own booking
  if (!booking) return { error: [404, 'Booking not found.'] };
  if (booking.paymentDetails?.status === 'paid') return { error: [409, 'This booking is already paid.'] };
  if (booking.status !== 'pending_payment') return { error: [409, 'This booking is not awaiting payment.'] };
  const total = booking.priceBreakdown?.total;
  if (!total || total < 1) return { error: [409, 'This booking has no confirmed price yet.'] };
  if (booking.moveDate && booking.moveDate.getTime() < Date.now()) return { error: [409, 'This slot has passed. Reschedule before paying.'] };
  return { booking, total };
};

const publicTxn = (t) => ({
  txnId: t.txnId, kind: t.kind, status: t.status, bookingId: t.bookingId, amount: t.amount, currency: t.currency,
  method: t.method, reason: t.reason || null, relatedTxnId: t.relatedTxnId || null, simulated: true, createdAt: t.createdAt
});

// GET /api/payments/config — what the checkout should show
router.get('/config', (req, res) => {
  res.json({ success: true, mode: 'simulated', demoPayments: demoPaymentsEnabled(), methods: METHODS, notice: DEMO_NOTICE });
});

// POST /api/payments/demo { bookingId, method: demo_card|demo_upi, outcome: success|failure, expectedAmount }
router.post('/demo', requireAuth, async (req, res) => {
  try {
    if (!demoPaymentsEnabled()) return res.status(503).json({ success: false, message: 'Payments are switched off on this server (DEMO_PAYMENTS_ENABLED=false).' });
    const { bookingId, method = 'demo_card', outcome = 'success', expectedAmount } = req.body || {};
    if (!METHODS.includes(method)) return res.status(400).json({ success: false, message: 'Choose Demo card or Demo UPI.' });
    if (!OUTCOMES.includes(outcome)) return res.status(400).json({ success: false, message: 'outcome must be success or failure.' });
    const { booking, total, error } = await payableBooking(bookingId, req.user.email);
    if (error) return res.status(error[0]).json({ success: false, message: error[1] });
    // The customer must be paying the amount they were shown; if the price changed, make them look again.
    if (expectedAmount !== undefined && Math.round(Number(expectedAmount)) !== Math.round(total)) {
      return res.status(409).json({ success: false, code: 'amount_changed', message: `The amount due is now ₹${total.toLocaleString('en-IN')}. Please review and pay again.`, total });
    }

    if (outcome === 'failure') {
      const txnId = await recordFailedPayment(booking, { amount: total, method, reason: DECLINE_REASON });
      return res.status(402).json({ success: false, code: 'payment_failed', message: `${DECLINE_REASON} No money was taken.`, txnId, simulated: true });
    }

    const paid = await markPaid(booking, { amount: total, method });
    if (!paid) return res.status(409).json({ success: false, message: 'This booking is already paid.' });
    res.json({ success: true, simulated: true, txnId: paid.txnId, message: `Simulated payment successful. ${DEMO_NOTICE}`, booking: paid.booking });
  } catch (err) {
    console.error('demo payment error:', err.message);
    res.status(500).json({ success: false, message: 'Could not record the payment. Nothing was charged.' });
  }
});

// GET /api/payments/history — my simulated transactions (payments and refunds as a customer, payouts as a captain)
router.get('/history', requireAuth, async (req, res) => {
  const rows = await PaymentTransaction.find({ userEmail: req.user.email }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, simulated: true, notice: DEMO_NOTICE, transactions: rows.map(publicTxn) });
});

// GET /api/payments/status/:bookingId — my booking's payment state plus its transactions (the receipt data)
router.get('/status/:bookingId', requireAuth, async (req, res) => {
  const booking = await MoveBooking.findOne({ bookingId: req.params.bookingId, userEmail: req.user.email }).lean();
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const rows = await PaymentTransaction.find({ bookingId: booking.bookingId, kind: { $in: ['payment', 'refund'] } }).sort({ createdAt: 1 }).lean();
  res.json({ success: true, simulated: true, status: booking.status, escrowStatus: booking.escrowStatus, paymentDetails: booking.paymentDetails, transactions: rows.map(publicTxn) });
});

export default router;
