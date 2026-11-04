import Razorpay from 'razorpay';
import crypto from 'crypto';
import express from 'express';
import { MoveBooking } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Lazy-initialize Razorpay only when keys are configured
const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/create-order  (protected)
// Creates a Razorpay order for the given booking.
// Frontend uses the order_id to launch Razorpay checkout.
// ─────────────────────────────────────────────────────────────────
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { bookingId, amount } = req.body; // amount in paise (INR × 100)

    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env.'
      });
    }

    const order = await getRazorpay().orders.create({
      amount: Math.round(amount), // paise
      currency: 'INR',
      receipt: bookingId || `PKG-${Date.now()}`,
      notes: {
        bookingId: bookingId || '',
        userEmail: req.user.email,
        platform: 'PackAndGo'
      }
    });

    return res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/payments/verify  (protected)
// Verifies Razorpay signature after successful payment.
// Updates MoveBooking escrow status in MongoDB.
// ─────────────────────────────────────────────────────────────────
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay payment identifiers.' });
    }

    // ── Verify HMAC signature ───────────────────────────────────
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
    }

    // ── Update booking in MongoDB ───────────────────────────────
    const booking = await MoveBooking.findOneAndUpdate(
      { bookingId },
      {
        $set: {
          escrowStatus: 'escrow_locked',
          'paymentDetails.status': 'Paid',
          'paymentDetails.method': 'Razorpay',
          'paymentDetails.transactionId': razorpay_payment_id,
          'paymentDetails.razorpayOrderId': razorpay_order_id,
          'paymentDetails.paidAt': new Date()
        }
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Payment verified and escrow locked!',
      paymentId: razorpay_payment_id,
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/payments/status/:bookingId  (protected)
// Returns the current payment and escrow status for a booking.
// ─────────────────────────────────────────────────────────────────
router.get('/status/:bookingId', requireAuth, async (req, res) => {
  try {
    const booking = await MoveBooking.findOne({ bookingId: req.params.bookingId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    return res.json({
      success: true,
      escrowStatus: booking.escrowStatus,
      paymentDetails: booking.paymentDetails
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

