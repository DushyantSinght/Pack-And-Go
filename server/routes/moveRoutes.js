import express from 'express';
import { MoveBooking } from '../models/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/moves/current — Fetch the most recent move booking for the logged-in user
// Uses optionalAuth so the estimator still works before login
router.get('/current', optionalAuth, async (req, res) => {
  try {
    const query = req.user ? { userEmail: req.user.email } : {};
    let move = await MoveBooking.findOne(query).sort({ updatedAt: -1 });

    if (!move) {
      // Auto-create a default booking
      move = await MoveBooking.create({
        bookingId: `PKG-MOV-${Date.now().toString().slice(-6)}`,
        userEmail: req.user?.email || 'guest@packandgo.in',
        userName: req.user?.name || 'Guest Mover',
        origin: 'HSR Layout Sector 1, Bengaluru',
        destination: 'Hope Farm, Whitefield, Bengaluru',
        presetId: 'studio-pg',
        totalCuFt: 115,
        estimatedWeightKg: 190,
        soloPrice: 5800,
        pooledPrice: 3190,
        savingsPercent: 45,
        isPriceLocked: true
      });
    }

    res.json({ success: true, move });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/moves — Create or update a move estimate (protected)
router.post('/', requireAuth, async (req, res) => {
  try {
    const moveData = { ...req.body, userEmail: req.user.email };
    let move;

    if (moveData.bookingId) {
      move = await MoveBooking.findOneAndUpdate(
        { bookingId: moveData.bookingId },
        { $set: moveData },
        { new: true, upsert: true }
      );
    } else {
      const generatedId = `PKG-MOV-${Date.now().toString().slice(-6)}`;
      move = await MoveBooking.create({ ...moveData, bookingId: generatedId });
    }

    res.json({ success: true, move });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/moves/:bookingId — Update specific booking (protected)
router.put('/:bookingId', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updated = await MoveBooking.findOneAndUpdate(
      { bookingId, userEmail: req.user.email }, // Scope to logged-in user
      { $set: req.body },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found or not yours.' });
    }

    res.json({ success: true, move: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/moves/verify-otp — Pickup / Dropoff OTP verification (protected)
router.post('/verify-otp', requireAuth, async (req, res) => {
  try {
    const { bookingId, otp, stage } = req.body;

    // ── Fixed: correct query construction ───────────────────────
    const queryFilter = bookingId
      ? { bookingId, userEmail: req.user.email }
      : { userEmail: req.user.email };

    const move = await MoveBooking.findOne(queryFilter).sort({ updatedAt: -1 });

    if (!move) {
      return res.status(404).json({ success: false, message: 'No active move booking found.' });
    }

    const isPickup = stage === 'pickup';
    const expectedOtp = isPickup ? move.pickupOtp : move.deliveryOtp;

    if (otp !== expectedOtp) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${stage} OTP. Please check and try again.`
      });
    }

    if (isPickup) {
      move.transitStatus = 'En-Route to Delivery • Geofence Active • Escrow Locked';
      move.escrowStatus = 'in_transit';
    } else {
      move.transitStatus = 'Delivered & Completed • Audit Verified';
      move.escrowStatus = 'released_to_captain';
    }

    await move.save();

    res.json({
      success: true,
      message: `${isPickup ? 'Pickup' : 'Delivery'} verified successfully!`,
      stage,
      transitStatus: move.transitStatus,
      escrowStatus: move.escrowStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
