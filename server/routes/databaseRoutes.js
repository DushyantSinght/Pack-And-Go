// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import { getDBStatus } from '../config/db.js';
import {
  User,
  MoveBooking,
  LuggagePassport,
  MarketplaceItem,
  PooledCorridor,
  CampusHub,
  SCHEMA_DEFINITIONS
} from '../models/index.js';
import { seedDatabase } from '../seed/seedData.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = express.Router();

// GET /api/database/status - Real-time MongoDB health, stats, and collection counts
router.get('/status', async (req, res) => {
  try {
    const dbStatus = getDBStatus();

    if (!dbStatus.isConnected) {
      return res.status(503).json({
        success: false,
        status: dbStatus,
        message: 'MongoDB is currently disconnected or connecting'
      });
    }

    const [
      userCount,
      moveCount,
      passportCount,
      marketplaceCount,
      corridorCount,
      campusCount
    ] = await Promise.all([
      User.countDocuments(),
      MoveBooking.countDocuments(),
      LuggagePassport.countDocuments(),
      MarketplaceItem.countDocuments(),
      PooledCorridor.countDocuments(),
      CampusHub.countDocuments()
    ]);

    res.json({
      success: true,
      status: dbStatus,
      collections: {
        users: { count: userCount, model: 'User' },
        movebookings: { count: moveCount, model: 'MoveBooking' },
        luggagepassports: { count: passportCount, model: 'LuggagePassport' },
        marketplaceitems: { count: marketplaceCount, model: 'MarketplaceItem' },
        pooledcorridors: { count: corridorCount, model: 'PooledCorridor' },
        campushubs: { count: campusCount, model: 'CampusHub' }
      },
      totalDocuments: userCount + moveCount + passportCount + marketplaceCount + corridorCount + campusCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong — please try again.' });
  }
});

// GET /api/database/schema - Full schema definitions and documentation
router.get('/schema', (req, res) => {
  res.json({
    success: true,
    schemas: SCHEMA_DEFINITIONS,
    databaseEngine: 'MongoDB with Mongoose ODM',
    serverLocalTime: new Date().toISOString()
  });
});

// POST /api/database/seed - Seed or reseed database.
// A forced reseed DELETES every collection (all users, bookings, chats…), so it is staff-only,
// needs ALLOW_DB_RESEED=true on the server, and the request must spell out the confirmation.
router.post('/seed', requireAuth, requireAdmin, async (req, res) => {
  try {
    const force = req.body?.force === true;
    if (force && process.env.ALLOW_DB_RESEED !== 'true') {
      return res.status(403).json({ success: false, message: 'Wiping and reseeding the database is turned off. Set ALLOW_DB_RESEED=true on the server to allow it.' });
    }
    if (force && req.body?.confirm !== 'DELETE ALL DATA') {
      return res.status(400).json({ success: false, message: 'A forced reseed deletes every user and booking. Send confirm: "DELETE ALL DATA" to proceed.' });
    }
    const result = await seedDatabase(force);
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Something went wrong — please try again.' });
  }
});

export default router;
