import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { generateOtp, verifyOtp, peekOtp } from '../middleware/otpStore.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// Sends a 6-digit OTP to the given phone number.
// ─────────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number.' });
    }

    const otp = generateOtp(phone.trim());

    // ── In production, call an SMS gateway here (e.g. Twilio, MSG91) ──
    // await smsClient.send({ to: `+91${phone}`, body: `Your Pack&Go OTP is ${otp}. Valid for 5 minutes.` });

    console.log(`[OTP] +91 ${phone} → ${otp}`); // Dev console only

    return res.json({
      success: true,
      message: `OTP sent to +91 ${phone}.`,
      // Dev helper: expose OTP only in development mode
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Accepts phone + OTP (primary) or email + password (fallback).
// Returns JWT + user profile.
// ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { phone, otp, email, password, name, userType } = req.body;

    let user;

    // ── Phone + OTP path (primary) ──────────────────────────────
    if (phone) {
      const result = verifyOtp(phone.trim(), otp);
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.reason });
      }

      user = await User.findOne({ phone: phone.trim() });
      if (!user) {
        // Auto-provision on first OTP login — pre-save hook will hash the password
        user = await User.create({
          name: name || `User +91${phone.slice(-4)}`,
          email: `user_${phone}@packandgo.in`,
          phone: phone.trim(),
          password: 'packandgo_default',
          userType: userType || 'student'
        });
      }
    }

    // ── Email + Password path (fallback) ────────────────────────
    else if (email && password) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'No account found with this email.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Provide either (phone + otp) or (email + password).' });
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
        userType: user.userType,
        college: user.college,
        society: user.society,
        escrowWalletBalance: user.escrowWalletBalance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// Creates a new account with hashed password.
// Returns JWT + user profile.
// ─────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, otp, userType, college, society } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required for signup.' });
    }

    // Verify OTP
    const result = verifyOtp(phone.trim(), otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [
        { email: email?.toLowerCase().trim() },
        { phone: phone.trim() }
      ]
    });

    if (existingUser) {
      const token = signToken({ _id: existingUser._id, email: existingUser.email, userType: existingUser.userType });
      return res.json({ success: true, token, user: existingUser, message: 'Account already exists. Logged in.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'packandgo_default', 10);
    const newUser = await User.create({
      name: name || 'New Resident',
      email: email ? email.toLowerCase().trim() : `user_${phone}@packandgo.in`,
      phone: phone.trim(),
      password: hashedPassword,
      userType: userType || 'student',
      college: college || '',
      society: society || ''
    });

    const token = signToken({ _id: newUser._id, email: newUser.email, userType: newUser.userType });

    return res.status(201).json({ success: true, token, user: newUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email or phone already exists.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/users  (protected — admin use)
// ─────────────────────────────────────────────────────────────────
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(10);
    return res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
