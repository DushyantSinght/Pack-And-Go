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
import { initSocket } from './socket.js';

// Import Route Handlers
import databaseRoutes from './routes/databaseRoutes.js';
import authRoutes from './routes/authRoutes.js';
import moveRoutes, { rotateLegacyOtps, migrateLegacyBookings } from './routes/moveRoutes.js';
import passportRoutes from './routes/passportRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import corridorRoutes from './routes/corridorRoutes.js';
import campusRoutes from './routes/campusRoutes.js';
import paymentRoutes, { razorpayWebhook } from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import logRoutes from './routes/logRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import { ErrorLog } from './models/index.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

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
        'script-src': ["'self'", 'https://checkout.razorpay.com'],
        'connect-src': ["'self'", 'wss:', 'ws:', 'https://nominatim.openstreetmap.org', 'https://*.razorpay.com', 'https://lumberjack.razorpay.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', 'https://images.unsplash.com', 'https://unpkg.com', 'https://*.razorpay.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'frame-src': ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
        'media-src': ["'self'", 'blob:']
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', // Vite sometimes picks 5174
  process.env.CLIENT_URL
].filter(Boolean);

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
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true
}));

// Provenance header on every response
app.use((req, res, next) => {
  res.set('X-Built-By', 'DST (Dushyant Singh Tanwar)');
  next();
});

// ── Rate Limiters ─────────────────────────────────────────────────
// General API: 1000 requests per 15 minutes per IP (chat history + inbox refreshes add up)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Brute-force protection: 20 FAILED attempts per 15 minutes per IP on credential
// endpoints. Successful requests don't count, so normal sign-ins never lock people out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' }
});

app.use('/api', generalLimiter);
app.use(['/api/auth/login', '/api/auth/signup', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email'], authLimiter);

// Razorpay webhook needs the raw body for its HMAC signature — mount before JSON parsing.
app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), razorpayWebhook);

// ── Body Parsers ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger ───────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// ── API Root ─────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    name: 'Pack&Go Relocation Operating System API',
    version: '2.0.0',
    database: dbStatus,
    auth: 'JWT Bearer Token (7 day expiry)',
    endpoints: [
      '/api/auth/login',
      '/api/auth/signup',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/moves/current',
      '/api/passports',
      '/api/marketplace',
      '/api/corridors',
      '/api/campus',
      '/api/payments/create-order',
      '/api/chat/conversations',
      '/api/payments/verify',
      '/api/database/status',
      '/api/database/schema'
    ]
  });
});

// ── Mount Routes ─────────────────────────────────────────────────
app.use('/api/database', databaseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/moves', moveRoutes);
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
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  ErrorLog.create({ source: 'server', message: err.message, stack: err.stack, url: `${req.method} ${req.originalUrl}`, userId: req.user?._id }).catch(() => {});
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
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
  const conn = await connectDB();

  if (conn) {
    try {
      // Demo data and demo logins (password demo1234) only exist outside production.
      if (seedDemo) await seedDatabase(false);
    } catch (seedErr) {
      console.warn('⚠️  Seed skipped or failed:', seedErr.message);
    }
    try {
      const migrated = await migrateLegacyBookings();
      if (migrated) console.log(`🧾 Reset ${migrated} legacy booking(s) with placeholder payment data to drafts.`);
      const rotated = await rotateLegacyOtps();
      if (rotated) console.log(`🔐 Replaced shared demo OTPs on ${rotated} booking(s) with unique codes.`);
    } catch (err) {
      console.warn('⚠️  OTP rotation skipped:', err.message);
    }
    try {
      if (seedDemo) await ensureDemoAccounts();
    } catch (err) {
      console.warn('⚠️  Demo contact accounts not synced:', err.message);
    }
  }

  const httpServer = http.createServer(app);
  initSocket(httpServer, (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)));

  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`   NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   CORS     : ${allowedOrigins.join(', ')}${process.env.NODE_ENV !== 'production' ? ' + any localhost port (dev)' : ''}`);
    console.log(`   DB       : ${process.env.MONGODB_URI}`);
    console.log(`   Realtime : Socket.IO chat + call signalling enabled`);
  });
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  ErrorLog.create({ source: 'server', message: String(reason?.message || reason), stack: reason?.stack }).catch(() => {});
});

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
