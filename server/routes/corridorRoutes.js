// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import { PooledCorridor } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/corridors — List all active pooled corridors (protected)
router.get('/', requireAuth, async (req, res) => {
  try {
    const corridors = await PooledCorridor.find();
    res.json({ success: true, count: corridors.length, corridors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/corridors/:corridorId/verify-stop — Verify stop checkpoint OTP (protected)
router.post('/:corridorId/verify-stop', requireAuth, async (req, res) => {
  try {
    const { corridorId } = req.params;
    const { stopId } = req.body;

    const corridor = await PooledCorridor.findOne({ corridorId });
    if (!corridor) {
      return res.status(404).json({ success: false, message: 'Corridor not found.' });
    }

    // Fixed: compare as both Number and String to handle schema differences
    const stop = corridor.stops.find(
      (s) => s.id === Number(stopId) || s.id === String(stopId)
    );

    if (!stop) {
      return res.status(404).json({ success: false, message: `Stop ID ${stopId} not found in this corridor.` });
    }

    stop.otpVerified = true;
    stop.status = 'Completed';
    await corridor.save();

    res.json({ success: true, message: 'Stop checkpoint verified.', corridor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
