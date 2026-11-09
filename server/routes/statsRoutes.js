// Public, cached platform numbers for the landing page. Real data only.
import express from 'express';
import { MoveBooking, User, LuggagePassport, MarketplaceItem } from '../models/index.js';

const router = express.Router();
let cache = { at: 0, data: null };

router.get('/', async (req, res) => {
  try {
    if (Date.now() - cache.at > 60_000 || !cache.data) {
      const [delivered, booked, captains, boxes, rehomed, co2, rating] = await Promise.all([
        MoveBooking.countDocuments({ status: 'delivered' }),
        MoveBooking.countDocuments({ status: { $in: ['confirmed', 'assigned', 'in_transit', 'delivered'] } }),
        User.countDocuments({ userType: 'captain', 'captain.status': 'approved' }),
        LuggagePassport.countDocuments(),
        MarketplaceItem.countDocuments({ status: { $in: ['claimed', 'sold'] } }),
        MarketplaceItem.aggregate([{ $group: { _id: null, kg: { $sum: '$co2SavedKg' } } }]),
        MoveBooking.aggregate([{ $match: { 'review.rating': { $gte: 1 } } }, { $group: { _id: null, avg: { $avg: '$review.rating' }, n: { $sum: 1 } } }])
      ]);
      cache = {
        at: Date.now(),
        data: {
          movesDelivered: delivered,
          movesBooked: booked,
          approvedCaptains: captains,
          boxesTracked: boxes,
          itemsRehomed: rehomed,
          co2SavedKg: Math.round(co2[0]?.kg || 0),
          avgRating: rating[0]?.avg ? Math.round(rating[0].avg * 10) / 10 : null,
          ratingCount: rating[0]?.n || 0
        }
      };
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, stats: cache.data });
  } catch {
    res.status(500).json({ success: false });
  }
});

export default router;
