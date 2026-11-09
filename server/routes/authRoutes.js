// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { profileOf, requireAdmin } from '../middleware/roles.js';
import { notifyAdminsOfApplication } from './adminRoutes.js';
import { sendEmail, emailConfigured, appUrl, notify } from '../services/notify.js';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const isDev = () => process.env.NODE_ENV !== 'production';

/** Sends (or, without SMTP in dev, logs + returns) an email verification link. */
const sendVerification = async (user) => {
  const token = newToken();
  await User.updateOne({ _id: user._id }, { $set: { emailVerifyTokenHash: sha256(token) } });
  const link = appUrl(`/?verify=${token}`);
  await sendEmail({
    to: user.email,
    subject: 'Verify your Pack&Go email',
    text: `Hi ${user.name?.split(' ')[0] || 'there'},\n\nConfirm your email to start booking moves:\n${link}\n\nIf you didn't create a Pack&Go account, ignore this email.`
  });
  return !emailConfigured() && isDev() ? link : undefined;
};

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
    const { name, email, password, userType, college, society, phone, licenseNumber, vehicleNumber, vehicleType, acceptTerms } = req.body;
    if (acceptTerms !== true) {
      return res.status(400).json({ success: false, message: 'Please accept the Terms of Service and Privacy Policy.' });
    }
    const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '').slice(-10) : '';
    const role = ['student', 'professional', 'captain', 'parent', 'outgoing'].includes(userType) ? userType : 'student';
    const cleanLicense = String(licenseNumber || '').toUpperCase().replace(/[\s-]/g, '');
    const cleanVehicle = String(vehicleNumber || '').toUpperCase().replace(/[\s-]/g, '');

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

    if (role === 'captain') {
      // Drivers apply; staff verify these details before approving.
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Move Captains must provide a 10-digit mobile number.' });
      }
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{9,12}$/.test(cleanLicense)) {
        return res.status(400).json({ success: false, message: 'Enter a valid driving licence number (e.g. KA0120190001234).' });
      }
      if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(cleanVehicle)) {
        return res.status(400).json({ success: false, message: 'Enter a valid vehicle registration number (e.g. KA01MJ4921).' });
      }
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
      userType: role,
      ...(cleanPhone.length === 10 && { phone: cleanPhone }),
      ...(role === 'captain' && {
        captain: {
          status: 'pending',
          licenseNumber: cleanLicense,
          vehicleNumber: cleanVehicle,
          vehicleType: String(vehicleType || '').slice(0, 60),
          appliedAt: new Date()
        }
      }),
      college: college || '',
      society: society || '',
      acceptedTermsAt: new Date()
    });

    const token = signToken({ _id: newUser._id, email: newUser.email, userType: newUser.userType });

    if (role === 'captain') notifyAdminsOfApplication(newUser).catch(() => {});
    const devVerifyLink = await sendVerification(newUser).catch(() => undefined);
    notify(newUser, { type: 'account', title: 'Welcome to Pack&Go!', body: 'Verify your email to start booking moves.' });

    return res.status(201).json({ success: true, token, user: profileOf(newUser), ...(devVerifyLink && { devVerifyLink }) });
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
    // Same message for unknown email and wrong password, so attackers can't
    // probe which emails have accounts.
    const isMatch = user?.password ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    }

    const token = signToken({ _id: user._id, email: user.email, userType: user.userType });

    return res.json({ success: true, token, user: profileOf(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password  { email }
// Always answers the same way so it can't be used to discover accounts.
// ─────────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const generic = { success: true, message: 'If an account exists for that email, a reset link is on its way.' };
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!validateEmail(email)) return res.json(generic);
    const user = await User.findOne({ email });
    if (!user) return res.json(generic);

    const token = newToken();
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordResetTokenHash: sha256(token), passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000) } }
    );
    const link = appUrl(`/?reset=${token}`);
    await sendEmail({
      to: user.email,
      subject: 'Reset your Pack&Go password',
      text: `Someone asked to reset your Pack&Go password.\n\nReset it here (valid for 30 minutes):\n${link}\n\nIf this wasn't you, you can ignore this email.`
    });
    // Without SMTP in development, hand the link back so the flow is testable.
    res.json({ ...generic, ...(!emailConfigured() && isDev() && { devResetLink: link }) });
  } catch {
    res.json(generic);
  }
});

// POST /api/auth/reset-password  { token, password }
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    const user = await User.findOne({
      passwordResetTokenHash: sha256(String(token || '')),
      passwordResetExpires: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired.' });

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: await bcrypt.hash(password, 12), emailVerified: true },
        $unset: { passwordResetTokenHash: '', passwordResetExpires: '' }
      }
    );
    notify(user, { type: 'account', title: 'Your password was changed', body: "If this wasn't you, contact Pack&Go support immediately.", email: true });
    res.json({ success: true, message: 'Password updated. You can sign in now.' });
  } catch {
    res.status(500).json({ success: false, message: 'Could not reset password.' });
  }
});

// POST /api/auth/verify-email  { token }
router.post('/verify-email', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { emailVerifyTokenHash: sha256(String(req.body.token || '')) },
      { $set: { emailVerified: true }, $unset: { emailVerifyTokenHash: '' } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(400).json({ success: false, message: 'This verification link is invalid or was already used.' });
    res.json({ success: true, message: 'Email verified!', user: profileOf(user) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not verify email.' });
  }
});

// POST /api/auth/resend-verification  (signed in)
router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false });
  if (user.emailVerified) return res.json({ success: true, message: 'Your email is already verified.' });
  const devVerifyLink = await sendVerification(user);
  res.json({ success: true, message: `Verification email sent to ${user.email}.`, ...(devVerifyLink && { devVerifyLink }) });
});

// PATCH /api/auth/me  { name, phone }  — keep your contact details current
router.patch('/me', requireAuth, async (req, res) => {
  const updates = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim().slice(0, 80);
  if (req.body.phone !== undefined) {
    const p = String(req.body.phone).replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(p)) return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' });
    updates.phone = p;
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: 'after' });
  res.json({ success: true, user: profileOf(user) });
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
    return res.json({ success: true, user: profileOf(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/users  (admins only)
// Lists most recent users. No passwords exposed.
// ─────────────────────────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
});

export default router;
