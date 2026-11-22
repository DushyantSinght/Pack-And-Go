// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { connectDB, getDBStatus } from './config/db.js';
import { seedDatabase } from './seed/seedData.js';
import { ensureDemoAccounts } from './seed/demoAccounts.js';
import mongoose from 'mongoose';
import { initSocket, closeSocket } from './socket.js';

// Import Route Handlers
import databaseRoutes from './routes/databaseRoutes.js';
import authRoutes from './routes/authRoutes.js';
import moveRoutes, { rotateLegacyOtps, migrateLegacyBookings } from './routes/moveRoutes.js';
import passportRoutes, { assignLegacyPassports } from './routes/passportRoutes.js';
import trackRoutes from './routes/trackRoutes.js';
import { startSlotWatcher } from './services/slotWatcher.js';
import marketplaceRoutes, { repairListingPhotos } from './routes/marketplaceRoutes.js';
import corridorRoutes from './routes/corridorRoutes.js';
import campusRoutes from './routes/campusRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import logRoutes from './routes/logRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import { ErrorLog, User } from './models/index.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { emailConfig, maskEmail } from './services/notify.js';
import { ensureAdminAccount } from './services/adminAccount.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// ── Security Headers (Helmet) ─────────────────────────────────────
app.set('trust proxy', 1); // behind a load balancer / reverse proxy in production
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        // CSP_CONNECT_EXTRA: comma-separated origins, e.g. a keyed geocoder set via VITE_GEOCODER_URL.
        'connect-src': ["'self'", 'wss:', 'ws:', 'https://nominatim.openstreetmap.org', ...String(process.env.CSP_CONNECT_EXTRA || '').split(',').map((o) => o.trim()).filter(Boolean)],
        'img-src': ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', 'https://images.unsplash.com', 'https://unpkg.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'frame-src': ["'none'"],
        'media-src': ["'self'", 'blob:']
      }
    },
    crossOriginEmbedderPolicy: false,
    // Send only our origin as the referrer to other sites (the browser default). Helmet's default
    // "no-referrer" makes map tile servers refuse requests ("Access blocked").
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);

// ── CORS ──────────────────────────────────────────────────────────
// Production trusts only CLIENT_URL (comma-separate several); local dev ports are allowed in development only.
const allowedOrigins = [
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:5174'] : []),
  ...String(process.env.CLIENT_URL || '').split(',').map((o) => o.trim().replace(/\/$/, ''))
].filter(Boolean).filter((o, i, all) => all.indexOf(o) === i);

// In development Vite may land on any free port (5173, 5174, 5175…), so any
// localhost / 127.0.0.1 origin is accepted. Production uses the list only.
const LOCAL_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/;
const isAllowedOrigin = (origin) =>
  allowedOrigins.includes(origin) ||
  (process.env.NODE_ENV !== 'production' && LOCAL_ORIGIN_RE.test(origin));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true);
    // Unknown origins simply get no CORS headers, so the browser blocks them (no 500, no log noise).
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true
}));

// Provenance header on every response
app.use((req, res, next) => {
  res.set('X-Built-By', 'DST (Dushyant Singh Tanwar)');
  next();
});

// ── Rate Limiters ─────────────────────────────────────────────────
// General API: 5000 requests per 15 minutes per IP. A whole campus Wi-Fi can share one IP, so this
// is generous; sign-in and AI endpoints keep their own strict limits. Override: GENERAL_RATE_LIMIT_MAX.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.GENERAL_RATE_LIMIT_MAX) || 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Brute-force protection: 20 FAILED attempts per 15 minutes per IP on credential
// endpoints (production). Successful requests don't count, so normal sign-ins never lock people
// out. Development allows 200 so repeated local test runs (which try wrong passwords on purpose)
// don't lock themselves out. Override with AUTH_RATE_LIMIT_MAX.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 20 : 200),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' }
});

app.use('/api', generalLimiter);
app.use(['/api/auth/login', '/api/auth/signup', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email', '/api/auth/change-password'], authLimiter);

// ── Body Parsers ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger ───────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api')) {
      // Never log secrets: drop query strings and hide family-tracking link tokens.
      const safeUrl = req.originalUrl.split('?')[0].replace(/^\/api\/track\/[^/]+/, '/api/track/[link]');
      console.log(`[API] ${req.method} ${safeUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// ── API Root ─────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    name: 'Pack&Go API',
    version: '2.1.0',
    auth: 'JWT Bearer token (7-day expiry, revocable)',
    health: '/api/health'
  });
});

// Lightweight liveness check for the hosting platform / Docker. Reveals nothing about the database.
app.get('/api/health', (req, res) => {
  const db = getDBStatus().isConnected;
  res.status(db ? 200 : 503).json({ ok: db });
});

// ── Mount Routes ─────────────────────────────────────────────────
app.use('/api/database', databaseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/moves', moveRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/passports', passportRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/corridors', corridorRoutes);
app.use('/api/campus', campusRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/stats', statsRoutes);

// ── Production: serve the built React app from /dist ─────────────
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist, { index: false, maxAge: '7d' }));
  app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// ── 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err, req, res, _next) => { // four args: Express treats this as the error handler
  console.error('Server Error:', err);
  ErrorLog.create({ source: 'server', message: err.message, stack: err.stack, url: `${req.method} ${req.originalUrl}`, userId: req.user?._id }).catch(() => {});
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    // Server faults never leak internals in production; 4xx messages are meant for the user.
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : err.message || 'Internal Server Error',
    // Only expose stack traces in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ── Start ────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const seedDemo = !isProd || process.env.SEED_DEMO_ACCOUNTS === 'true';

const startServer = async () => {
  if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /change_in_production/.test(process.env.JWT_SECRET))) {
    console.error('❌ Set a strong JWT_SECRET (32+ random characters) before running in production.');
    process.exit(1);
  }
  console.log('🚀 Initializing Pack&Go MongoDB Backend Server v2.0...');
  // A hosted database can be briefly unreachable while the app starts: retry in production, and
  // exit if it never comes up so the host restarts us (instead of running without a database).
  let conn = await connectDB();
  for (let attempt = 1; !conn && isProd && attempt < 10; attempt += 1) {
    const wait = Math.min(30_000, 2_000 * attempt);
    console.warn(`⏳ Database not reachable — retrying in ${wait / 1000}s (attempt ${attempt + 1} of 10)`);
    await new Promise((r) => setTimeout(r, wait));
    conn = await connectDB();
  }
  if (!conn && isProd) {
    console.error('❌ Could not reach the database. Exiting so the host can restart the app.');
    process.exit(1);
  }

  if (conn) {
    try {
      // Demo data and demo logins (password demo1234) only exist outside production.
      if (seedDemo) await seedDatabase(false);
    } catch (seedErr) {
      console.warn('⚠️  Seed skipped or failed:', seedErr.message);
    }
    // One-time repairs for data created by older development builds. They change stored data,
    // so production skips them unless RUN_STARTUP_REPAIRS=true is set deliberately.
    if (!isProd || process.env.RUN_STARTUP_REPAIRS === 'true') {
      try {
        const migrated = await migrateLegacyBookings();
        if (migrated) console.log(`🧾 Reset ${migrated} legacy booking(s) with placeholder payment data to drafts.`);
        await assignLegacyPassports();
        const repaired = await repairListingPhotos();
        if (repaired) console.log(`🖼️  Repaired ${repaired} listing photo(s) that were missing or wrong.`);
        // Profile pictures: drop the old stock-photo default so the app shows initials.
        await User.updateMany({ avatar: { $regex: 'photo-1535713875002-d1d0cf377fde' } }, { $set: { avatar: '' } });
        const rotated = await rotateLegacyOtps();
        if (rotated) console.log(`🔐 Replaced shared demo OTPs on ${rotated} booking(s) with unique codes.`);
      } catch (err) {
        console.warn('⚠️  OTP rotation skipped:', err.message);
      }
    }
    try {
      if (seedDemo) await ensureDemoAccounts();
    } catch (err) {
      console.warn('⚠️  Demo contact accounts not synced:', err.message);
    }
    try {
      const admin = await ensureAdminAccount();
      if (admin.status === 'created') console.log('👤 Admin account created.');
      else if (admin.status === 'not_configured') console[isProd ? 'error' : 'log'](`${isProd ? '❌' : 'ℹ️ '} No admin configured: set ADMIN_EMAIL (and ADMIN_PASSWORD the first time) in server/.env.`);
    } catch (err) {
      console.error('❌ Admin account check failed:', err.message);
    }
  }

  if (process.env.NODE_ENV !== 'test') slotWatcher = startSlotWatcher();

  const httpServer = http.createServer(app);
  initSocket(httpServer, (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)));

  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`   NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   CORS     : ${allowedOrigins.join(', ')}${process.env.NODE_ENV !== 'production' ? ' + any localhost port (dev)' : ''}`);
    // Host only: a hosted MONGODB_URI contains the database password.
    console.log(`   DB       : ${getDBStatus().host}`);
    console.log(`   Realtime : Socket.IO chat + call signalling enabled`);
    const mail = emailConfig();
    if (mail.configured) console.log(`   Email    : SMTP ${mail.host}:${mail.port}${mail.secure ? ' (TLS)' : ' (STARTTLS)'} from ${maskEmail(mail.from.replace(/^.*<|>.*$/g, ''))}`);
    else if (isProd) console.error(`❌ Email delivery is NOT configured: ${mail.errors.join('; ')}. Verification and password-reset emails cannot be sent. See server/.env.example.`);
    else console.log(`   Email    : not configured (${mail.errors.join('; ')}) — dev links are shown in the app instead`);
  });
};

// ── Graceful shutdown ── hosts send SIGTERM on redeploy/restart: stop taking requests, close
// sockets and the database cleanly, and force-exit if that takes more than 10 seconds.
let slotWatcher = null;
let shuttingDown = false;
const shutdown = (signal, code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`👋 ${signal} received — shutting down`);
  if (slotWatcher) clearInterval(slotWatcher);
  setTimeout(() => process.exit(1), 10_000).unref();
  closeSocket(() => {
    mongoose.disconnect().catch(() => {}).finally(() => process.exit(code));
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  ErrorLog.create({ source: 'server', message: err.message, stack: err.stack }).catch(() => {}).finally(() => shutdown('uncaughtException', 1));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  ErrorLog.create({ source: 'server', message: String(reason?.message || reason), stack: reason?.stack }).catch(() => {});
});

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
