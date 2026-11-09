import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ─── Validation helpers ───────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// name + email + password + userType → bcrypt hash → JWT + user
// ─────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, userType, college, society, phone } = req.body;
    const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '').slice(-10) : '';

    // ── Validation ───────────────────────────────────────────────
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Duplicate check ──────────────────────────────────────────
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // ── Hash password (salt rounds 12 for production) ────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      userType: ['student', 'professional', 'captain', 'parent', 'outgoing'].includes(userType) ? userType : 'student',
      ...(cleanPhone.length === 10 && { phone: cleanPhone }),
      college: college || '',
      society: society || ''
    });

    const token = signToken({ _id: newUser._id, email: newUser.email, userType: newUser.userType });

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        avatar: newUser.avatar,
        userType: newUser.userType,
        college: newUser.college,
        society: newUser.society,
        escrowWalletBalance: newUser.escrowWalletBalance,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// email + password → JWT + user
// ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validation ───────────────────────────────────────────────
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Look up user (include password field) ────────────────────
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this email.' });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'This account has no password set. Please sign up.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    const token = signToken({ _id: user._id, email: user.email, userType: user.userType });

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        userType: user.userType,
        college: user.college,
        society: user.society,
        escrowWalletBalance: user.escrowWalletBalance,
        tripsCompleted: user.tripsCompleted,
        rating: user.rating
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Token invalidation is client-side. Server simply confirms.
// ─────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully. Please discard your token.' });
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// Returns the currently authenticated user's profile.
// ─────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/users  (protected — admin use)
// Lists most recent users. No passwords exposed.
// ─────────────────────────────────────────────────────────────────
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
});

export default router;
