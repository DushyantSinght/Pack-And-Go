// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import crypto from 'node:crypto';
import express from 'express';
import { MarketplaceItem, User } from '../models/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { notify } from '../services/notify.js';

const router = express.Router();

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

/**
 * What a browser of the marketplace sees. Contact details never leave the server — buyers and
 * sellers reach each other through Pack&Go chat and calls — and only the seller learns who claimed.
 */
const publicItem = (doc, myEmail) => {
  const { claimedBy, seller, __v, ...rest } = doc.toObject ? doc.toObject() : doc;
  const mine = !!myEmail && seller?.email === myEmail;
  return {
    ...rest,
    seller: { name: seller?.name || 'Resident', userType: seller?.userType },
    mine,
    claimedByMe: !!myEmail && claimedBy?.email === myEmail,
    ...(mine && claimedBy && { claimedBy: { name: claimedBy.name, claimedAt: claimedBy.claimedAt } })
  };
};
/** Accept an https image link or an uploaded photo (data URL); anything else → no photo. */
const cleanImage = (v) => {
  const s = String(v || '').trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(s) && s.length < 2048) return s;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length * 0.75 <= MAX_PHOTO_BYTES) return s;
  return '';
};

/** Startup fix: listings pointing at photos that no longer exist or show the wrong thing. */
export const repairListingPhotos = async () => {
  const DEAD = 'photo-1580481077194-46327b876404';
  const YARN = 'photo-1584992236310-6edddc08acff';
  const CHAIR = 'https://images.unsplash.com/photo-1688578735352-9a6f2ac3b70a?auto=format&fit=crop&w=600&q=80';
  const FRIDGE = 'https://images.unsplash.com/photo-1540961403310-79825242906e?auto=format&fit=crop&w=600&q=80';
  const r1 = await MarketplaceItem.updateMany(
    { itemId: 'circ-2', imageUrl: { $regex: DEAD } },
    { $set: { imageUrl: CHAIR, title: 'Green Soul Ergonomic Office Chair (Grey)' } }
  );
  const r2 = await MarketplaceItem.updateMany({ imageUrl: { $regex: DEAD } }, { $set: { imageUrl: '' } });
  const r3 = await MarketplaceItem.updateMany({ imageUrl: { $regex: YARN } }, { $set: { imageUrl: FRIDGE } });
  // Older listings got a made-up "was" price (2.2× or 2.5× the asking price) — drop it.
  await MarketplaceItem.updateMany(
    { $expr: { $or: [2.2, 2.5].map((k) => ({ $lt: [{ $abs: { $subtract: ['$originalPrice', { $multiply: ['$price', k] }] } }, 0.01] })) } },
    [{ $set: { originalPrice: '$price' } }],
    { updatePipeline: true }
  );
  return r1.modifiedCount + r2.modifiedCount + r3.modifiedCount;
};

// GET /api/marketplace — List items (public, optionally filtered)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, society, status } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = category;
    if (society && society !== 'All') query.society = new RegExp(society, 'i');
    // Listings the admin removed are never shown publicly.
    query.status = status && status !== 'removed' ? status : { $ne: 'removed' };

    const items = await MarketplaceItem.find(query).sort({ createdAt: -1 });

    const carbonAgg = await MarketplaceItem.aggregate([
      { $group: { _id: null, totalCO2: { $sum: '$co2SavedKg' } } }
    ]);
    const totalCarbonSavedKg = carbonAgg[0]?.totalCO2 || 142;

    res.json({ success: true, count: items.length, totalCarbonSavedKg, items: items.map((i) => publicItem(i, req.user?.email)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong — please try again.' });
  }
});

// POST /api/marketplace — Create a new listing (protected)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { society, category, price, originalPrice, condition, description, imageUrl } = req.body;
    const title = String(req.body.title || '').trim().slice(0, 120);
    const parsedPrice = Math.round(Number(price));
    if (!title) return res.status(400).json({ success: false, message: 'Give your listing a title.' });
    if (!(parsedPrice > 0 && parsedPrice <= 1_000_000)) return res.status(400).json({ success: false, message: 'Enter a price between ₹1 and ₹10,00,000.' });
    const mrp = Math.round(Number(originalPrice));
    const co2SavedKg = Math.round(parsedPrice / 100) + 15;
    const itemId = `circ-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const me = await User.findById(req.user._id).lean();

    const newItem = await MarketplaceItem.create({
      itemId,
      title,
      society: String(society || 'Location not given').slice(0, 120),
      category: String(category || 'Furniture').slice(0, 40),
      price: parsedPrice,
      originalPrice: mrp > parsedPrice ? mrp : parsedPrice, // no made-up "was" price
      condition: String(condition || 'Very Good').slice(0, 80),
      handoffType: 'Direct In-Building P2P',
      zeroTransitFee: true,
      co2SavedKg,
      imageUrl: cleanImage(imageUrl),
      description: String(description || 'Outgoing tenant zero-transit handoff.').slice(0, 1000),
      seller: {
        name: me?.name || 'Outgoing Tenant',
        phone: me?.phone || '',
        email: req.user.email,
        userType: me?.userType || 'outgoing'
      },
      status: 'available'
    });

    res.status(201).json({ success: true, item: publicItem(newItem, req.user.email) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong — please try again.' });
  }
});

// PATCH /api/marketplace/:itemId — the seller edits their own listing (while it's still available)
router.patch('/:itemId', requireAuth, async (req, res) => {
  try {
    const item = await MarketplaceItem.findOne({ itemId: String(req.params.itemId), 'seller.email': req.user.email });
    if (!item) return res.status(404).json({ success: false, message: 'Listing not found.' });
    if (item.status === 'removed') return res.status(409).json({ success: false, message: 'Pack&Go removed this listing, so it can’t be edited.' });
    if (item.status !== 'available') return res.status(409).json({ success: false, message: 'This item has been claimed — chat with the buyer instead of editing it.' });
    const b = req.body || {};
    if ('title' in b) {
      const title = String(b.title || '').trim().slice(0, 120);
      if (!title) return res.status(400).json({ success: false, message: 'Give your listing a title.' });
      item.title = title;
    }
    if ('price' in b) {
      const price = Math.round(Number(b.price));
      if (!(price > 0 && price <= 1_000_000)) return res.status(400).json({ success: false, message: 'Enter a price between ₹1 and ₹10,00,000.' });
      item.price = price;
      item.co2SavedKg = Math.round(price / 100) + 15;
    }
    if ('originalPrice' in b) item.originalPrice = Math.round(Number(b.originalPrice)) || item.price;
    if (item.originalPrice < item.price) item.originalPrice = item.price; // no fake discounts
    for (const [k, max] of [['condition', 80], ['description', 1000], ['category', 40], ['society', 120]]) {
      if (typeof b[k] === 'string' && b[k].trim()) item[k] = b[k].trim().slice(0, max);
    }
    if ('imageUrl' in b) item.imageUrl = cleanImage(b.imageUrl);
    await item.save();
    res.json({ success: true, item: publicItem(item, req.user.email) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not update the listing.' });
  }
});

// DELETE /api/marketplace/:itemId — the seller takes their listing down
router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    const item = await MarketplaceItem.findOne({ itemId: String(req.params.itemId), 'seller.email': req.user.email });
    if (!item) return res.status(404).json({ success: false, message: 'Listing not found.' });
    if (item.status === 'removed') return res.status(409).json({ success: false, message: 'Pack&Go already removed this listing.' });
    if (item.status !== 'available') return res.status(409).json({ success: false, message: 'Someone has claimed this item — arrange the handoff with them in Messages first.' });
    await item.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not remove the listing.' });
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
    if (item.seller?.email && item.seller.email === req.user.email) {
      return res.status(409).json({ success: false, message: "That's your own listing." });
    }

    // Atomic: only one buyer can flip it from available → claimed.
    const me = await User.findById(req.user._id).lean();
    const claimed = await MarketplaceItem.findOneAndUpdate(
      { itemId, status: 'available' },
      { $set: { status: 'claimed', claimedBy: { name: me?.name || 'Incoming Resident', phone: me?.phone || '', email: req.user.email, claimedAt: new Date() } } },
      { returnDocument: 'after' }
    );
    if (!claimed) return res.status(409).json({ success: false, message: 'This item has already been claimed.' });
    if (item.seller?.email) {
      notify(item.seller.email, {
        type: 'marketplace', // the seller's screen reloads its listings when this arrives
        title: `${me?.name || 'Someone'} claimed “${item.title}”`,
        body: 'Chat with them from Messages to arrange the handoff.',
        email: true
      });
    }

    res.json({
      success: true,
      message: `Claimed "${item.title}"! Saved ${item.co2SavedKg} kg CO2 emissions.`,
      item: publicItem(claimed, req.user.email)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Could not claim this item.' });
  }
});

export default router;
