import express from 'express';
import { LuggagePassport } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/passports — List all box passports (protected)
router.get('/', requireAuth, async (req, res) => {
  try {
    const passports = await LuggagePassport.find().sort({ createdAt: -1 });
    res.json({ success: true, count: passports.length, passports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/passports — Create a new digital luggage box passport (protected)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { category, label, fragile, items, boxSize, preMovePhotoUrl } = req.body;
    const count = await LuggagePassport.countDocuments();
    const padded = String(count + 1).padStart(2, '0');
    const boxNumber = `Box ${padded} of ${padded}`;
    const generatedBoxId = `PKG-BOX-${Math.floor(1000 + Math.random() * 9000)}-${fragile ? 'FRAGILE' : 'CUSTOM'}`;

    const newBox = await LuggagePassport.create({
      boxId: generatedBoxId,
      boxNumber,
      category: category || 'General Household',
      label: label || 'Custom Packed Carton',
      fragile: !!fragile,
      boxSize: boxSize || 'Medium Sturdy (18" x 14" x 12")',
      sealStatus: `Tamper-Evident RFID Tape #TX-${Math.floor(1000 + Math.random() * 9000)}`,
      conditionAtOrigin: 'Pre-Move Photographed & Sealed',
      conditionAtDropoff: 'Pending Delivery Audit',
      preMovePhotoUrl: preMovePhotoUrl || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
      postMovePhotoUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
      itemsContained: Array.isArray(items) ? items : [items || 'Packed belongings'],
      depositProtectionNote: 'Protected under Pack&Go Deposit Escrow.',
      qrDataString: `PACKANDGO://PASSPORT/${generatedBoxId}?t=${Date.now()}&db=mongo`
    });

    res.status(201).json({ success: true, box: newBox });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/passports/:boxId — Get single box passport (protected)
router.get('/:boxId', requireAuth, async (req, res) => {
  try {
    const box = await LuggagePassport.findOne({ boxId: req.params.boxId });
    if (!box) return res.status(404).json({ success: false, message: 'Box passport not found.' });
    res.json({ success: true, box });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/passports/:boxId — Update condition / audit checkpoint (protected)
router.patch('/:boxId', requireAuth, async (req, res) => {
  try {
    const updatedBox = await LuggagePassport.findOneAndUpdate(
      { boxId: req.params.boxId },
      { $set: req.body },
      { new: true }
    );
    if (!updatedBox) return res.status(404).json({ success: false, message: 'Box passport not found.' });
    res.json({ success: true, box: updatedBox });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
