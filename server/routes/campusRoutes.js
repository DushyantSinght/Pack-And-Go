import express from 'express';
import { CampusHub } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/campus — Get all campus hubs (protected)
router.get('/', requireAuth, async (req, res) => {
  try {
    const hubs = await CampusHub.find();
    res.json({ success: true, count: hubs.length, hubs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/campus/:hubId/join — Join campus move pool (protected)
router.post('/:hubId/join', requireAuth, async (req, res) => {
  try {
    const { hubId } = req.params;
    const { college } = req.body;

    const hub = await CampusHub.findOne({ hubId });
    if (!hub) {
      return res.status(404).json({ success: false, message: 'Campus hub not found.' });
    }

    // Prevent duplicate joins for the same user
    const alreadyJoined = hub.members.some((m) => m.email === req.user.email);
    if (alreadyJoined) {
      return res.json({ success: true, message: 'You have already joined this hub.', hub });
    }

    hub.activeStudentsJoining += 1;
    hub.members.push({
      name: req.user.name || 'Student Mover',
      email: req.user.email,
      phone: req.user.phone || '9876543210',
      college: college || hub.name
    });

    if (hub.activeStudentsJoining >= hub.nextTierTarget && hub.discountTier < 50) {
      hub.discountTier += 5;
      hub.nextTierTarget += 10;
    }

    await hub.save();

    res.json({
      success: true,
      message: `Joined ${hub.name} Move Pool! Current pool discount: ${hub.discountTier}%`,
      hub
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
