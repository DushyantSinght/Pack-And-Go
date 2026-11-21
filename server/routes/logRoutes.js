// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Client-side error reporting. Errors land in a capped Mongo collection and the server log.
import express from 'express';
import rateLimit from 'express-rate-limit';
import { ErrorLog } from '../models/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const limiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/client-error', limiter, optionalAuth, async (req, res) => {
  const { message, stack, url, meta } = req.body || {};
  console.error(`🛑 [client] ${String(message).slice(0, 300)} @ ${String(url).slice(0, 200)}`);
  await ErrorLog.create({
    source: 'client',
    message: String(message || '').slice(0, 2000),
    stack: String(stack || '').slice(0, 8000),
    url: String(url || '').slice(0, 500),
    userAgent: String(req.get('user-agent') || '').slice(0, 300),
    userId: req.user?._id,
    // Cutting a JSON string mid-way makes it unparseable — store small metadata whole, else just note its size.
    meta: meta && typeof meta === 'object' ? (() => { const j = JSON.stringify(meta); return j.length <= 2000 ? JSON.parse(j) : { truncated: true, bytes: j.length }; })() : undefined
  }).catch(() => {});
  res.status(204).end();
});

export default router;
