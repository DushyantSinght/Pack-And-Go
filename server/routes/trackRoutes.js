// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Public, read-only live tracking for family members who were sent a link by the customer.
// It shows progress and the truck's position — never phone numbers, OTPs, prices or emails.
import express from 'express';
import { MoveBooking, User } from '../models/index.js';

const router = express.Router();
const LINK_TTL_AFTER_DELIVERY_MS = 48 * 3_600_000;
const LOCATION_FRESH_MS = 30 * 60_000;
const area = (addr = '') => String(addr).split(',').slice(0, 2).join(',').trim();

// GET /api/track/:token
router.get('/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return res.status(404).json({ success: false, message: 'This tracking link is not valid.' });
    const m = await MoveBooking.findOne({ trackToken: token }).lean();
    if (!m) return res.status(404).json({ success: false, message: 'This tracking link is not valid or was turned off.' });
    const finished = m.status === 'cancelled' || (m.status === 'delivered' && Date.now() - new Date(m.deliveredAt || 0).getTime() > LINK_TTL_AFTER_DELIVERY_MS);
    if (finished) return res.status(410).json({ success: false, message: m.status === 'cancelled' ? 'This move was cancelled, so the tracking link has ended.' : 'This move is complete — the tracking link has expired.' });

    const cap = m.assignedCaptainEmail
      ? await User.findOne({ email: m.assignedCaptainEmail }).select('name avatar rating ratingCount captain.vehicleNumber captain.vehicleType').lean()
      : null;
    const loc = m.driverLocation;
    res.json({
      success: true,
      track: {
        bookingId: m.bookingId,
        status: m.status,
        transitStatus: m.transitStatus,
        moveDate: m.moveDate,
        timeSlot: m.timeSlot,
        customerFirstName: String(m.userName || '').split(' ')[0] || 'Your family member',
        origin: area(m.origin),
        destination: area(m.destination),
        originLocation: m.originLocation,
        destinationLocation: m.destinationLocation,
        distanceKm: m.distanceKm,
        assignedAt: m.assignedAt,
        pickupVerifiedAt: m.pickupVerifiedAt,
        deliveredAt: m.deliveredAt,
        driverLocation: loc?.lat && Date.now() - new Date(loc.updatedAt || 0).getTime() < LOCATION_FRESH_MS ? loc : null,
        captain: cap && {
          firstName: String(cap.name || '').split(' ')[0],
          avatar: cap.avatar,
          rating: cap.ratingCount ? cap.rating : null,
          vehicleNumber: cap.captain?.vehicleNumber,
          vehicleType: cap.captain?.vehicleType
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not load tracking right now.' });
  }
});

export default router;
