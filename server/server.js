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
import moveRoutes from './routes/moveRoutes.js';
import passportRoutes from './routes/passportRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import corridorRoutes from './routes/corridorRoutes.js';
import campusRoutes from './routes/campusRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// ── Security Headers (Helmet) ─────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', // Vite sometimes picks 5174
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true
}));

// ── Rate Limiters ─────────────────────────────────────────────────
// General API: 1000 requests per 15 minutes per IP (chat history + inbox refreshes add up)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// Auth routes: stricter — 30 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

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

// ── 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only expose stack traces in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ── Start ────────────────────────────────────────────────────────
const startServer = async () => {
  console.log('🚀 Initializing Pack&Go MongoDB Backend Server v2.0...');
  const conn = await connectDB();

  if (conn) {
    try {
      await seedDatabase(false);
    } catch (seedErr) {
      console.warn('⚠️  Seed skipped or failed:', seedErr.message);
    }
    try {
      await ensureDemoAccounts();
    } catch (err) {
      console.warn('⚠️  Demo contact accounts not synced:', err.message);
    }
  }

  const httpServer = http.createServer(app);
  initSocket(httpServer, allowedOrigins);

  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`   NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   CORS     : ${allowedOrigins.join(', ')}`);
    console.log(`   DB       : ${process.env.MONGODB_URI}`);
    console.log(`   Realtime : Socket.IO chat + call signalling enabled`);
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
