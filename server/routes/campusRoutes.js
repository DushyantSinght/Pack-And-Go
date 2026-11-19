// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import { CampusHub, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/campus — Get all campus hubs (protected)
router.get('/', requireAuth, async (req, res) => {
  try {
    // Never send other students' names/emails/phones — just counts and whether I joined.
    const hubs = await CampusHub.find().lean();
    res.json({
      success: true,
      count: hubs.length,
      hubs: hubs.map(({ members = [], ...h }) => ({ ...h, memberCount: members.length, joined: members.some((m) => m.email === req.user.email) }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong — please try again.' });
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
      return res.json({ success: true, alreadyJoined: true, message: 'You have already joined this hub.', discountTier: hub.discountTier });
    }
    const me = await User.findById(req.user._id).lean();

    hub.activeStudentsJoining += 1;
    hub.members.push({
      name: me?.name || 'Student',
      email: req.user.email,
      phone: me?.phone || '',
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
      discountTier: hub.discountTier,
      activeStudentsJoining: hub.activeStudentsJoining
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong — please try again.' });
  }
});

export default router;
