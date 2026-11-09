import express from 'express';
import mongoose from 'mongoose';
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
    res.status(500).json({ success: false, error: error.message });
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
// A forced reseed DELETES every collection, so it needs a signed-in user and is
// disabled in production unless ALLOW_DB_RESEED=true is set explicitly.
router.post('/seed', requireAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DB_RESEED !== 'true') {
      return res.status(403).json({ success: false, message: 'Database reseeding is disabled in production.' });
    }
    const force = req.body?.force === true;
    const result = await seedDatabase(force);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
