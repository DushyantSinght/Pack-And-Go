import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDBStatus } from './config/db.js';
import { seedDatabase } from './seed/seedData.js';

// Import Route Handlers
import databaseRoutes from './routes/databaseRoutes.js';
import authRoutes from './routes/authRoutes.js';
import moveRoutes from './routes/moveRoutes.js';
import passportRoutes from './routes/passportRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import corridorRoutes from './routes/corridorRoutes.js';
import campusRoutes from './routes/campusRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middlewares ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
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
      '/api/auth/send-otp',
      '/api/auth/login',
      '/api/auth/signup',
      '/api/auth/me',
      '/api/moves/current',
      '/api/passports',
      '/api/marketplace',
      '/api/corridors',
      '/api/campus',
      '/api/payments/create-order',
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

// ── Global Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
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
      console.warn('⚠️ Seed check notice:', seedErr.message);
    }
  } else {
    console.warn('⚠️ Started without active MongoDB connection.');
  }

  app.listen(PORT, () => {
    console.log(`📡 Pack&Go API Server running on http://localhost:${PORT}`);
    console.log(`🔐 Auth: JWT enabled (7-day tokens)`);
    console.log(`💳 Payments: Razorpay ${process.env.RAZORPAY_KEY_ID ? '✅ configured' : '⚠️  keys not set'}`);
    console.log(`📊 Schema Inspector: http://localhost:${PORT}/api/database/schema`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/database/status`);
  });
};

startServer();
