// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import { MarketplaceItem, User } from '../models/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/marketplace — List items (public, optionally filtered)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, society, status } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = category;
    if (society && society !== 'All') query.society = new RegExp(society, 'i');
    if (status) query.status = status;

    const items = await MarketplaceItem.find(query).sort({ createdAt: -1 });

    const carbonAgg = await MarketplaceItem.aggregate([
      { $group: { _id: null, totalCO2: { $sum: '$co2SavedKg' } } }
    ]);
    const totalCarbonSavedKg = carbonAgg[0]?.totalCO2 || 142;

    res.json({ success: true, count: items.length, totalCarbonSavedKg, items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/marketplace — Create a new listing (protected)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, society, category, price, originalPrice, condition, description, imageUrl } = req.body;
    const parsedPrice = Number(price);
    const co2SavedKg = Math.round(parsedPrice / 100) + 15;
    const itemId = `circ-${Date.now()}`;
    const me = await User.findById(req.user._id).lean();

    const newItem = await MarketplaceItem.create({
      itemId,
      title,
      society: society || 'Prestige Falcon City, Bengaluru',
      category: category || 'Furniture',
      price: parsedPrice,
      originalPrice: Number(originalPrice) || parsedPrice * 2.2,
      condition: condition || 'Very Good',
      handoffType: 'Direct In-Building P2P',
      zeroTransitFee: true,
      co2SavedKg,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1580481077194-46327b876404?auto=format&fit=crop&w=600&q=80',
      description: description || 'Outgoing tenant zero-transit handoff.',
      seller: {
        name: me?.name || 'Outgoing Tenant',
        phone: me?.phone || '',
        email: req.user.email,
        userType: me?.userType || 'outgoing'
      },
      status: 'available'
    });

    res.status(201).json({ success: true, item: newItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/marketplace/:itemId/claim — Claim an item (protected)
router.post('/:itemId/claim', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await MarketplaceItem.findOne({ itemId });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (item.status !== 'available') {
      return res.status(409).json({ success: false, message: 'This item has already been claimed.' });
    }

    item.status = 'claimed';
    const me = await User.findById(req.user._id).lean();
    item.claimedBy = {
      name: me?.name || 'Incoming Resident',
      phone: me?.phone || '',
      email: req.user.email,
      claimedAt: new Date()
    };
    await item.save();

    res.json({
      success: true,
      message: `Claimed "${item.title}"! Saved ${item.co2SavedKg} kg CO2 emissions.`,
      item
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
