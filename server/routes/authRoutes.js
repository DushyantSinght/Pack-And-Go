// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { signToken, requireAuth, revokeToken } from '../middleware/auth.js';
import { isReservedAdminEmail } from '../services/adminAccount.js';
import { passwordProblem } from '../services/passwordPolicy.js';
import { isAdminUser } from '../middleware/roles.js';
import { profileOf, requireAdmin } from '../middleware/roles.js';
import { notifyAdminsOfApplication } from './adminRoutes.js';
import { sendEmail, emailConfigured, appUrl, notify } from '../services/notify.js';
import { verificationEmail, passwordResetEmail } from '../services/emails.js';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const isDev = () => process.env.NODE_ENV !== 'production';

/**
 * Emails a fresh verification link.
 * @returns {{ status: 'sent'|'not_configured'|'failed', devLink?: string }} — devLink only in
 *   development when no email server is set up, so the flow can still be tested locally.
 */
const sendVerification = async (user) => {
  const token = newToken();
  await User.updateOne({ _id: user._id }, { $set: { emailVerifyTokenHash: sha256(token) } });
  const link = appUrl(`/?verify=${token}`);
  const status = await sendEmail({ to: user.email, ...verificationEmail({ name: user.name, link }) });
  // Dev only: when nothing was sent (no SMTP, or a test address that can't receive mail), hand the link back.
  return { status, ...(['not_configured', 'skipped'].includes(status) && isDev() && { devLink: link }) };
};

/** What to tell the user about an email we tried to send. */
const deliveryMessage = (status, email) =>
  status === 'sent'
    ? `Verification email sent to ${email}.`
    : status === 'not_configured'
      ? 'Email delivery is not set up on this server yet, so no email was sent.'
      : "We couldn't send the email right now. Please try again in a few minutes.";

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
    if (name.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Please keep your name under 80 characters.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) return res.status(400).json({ success: false, message: pwProblem });

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

    // The admin address belongs to the fixed admin account; nobody can register it.
    if (isReservedAdminEmail(normalizedEmail)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

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

    const token = signToken(newUser);

    if (role === 'captain') notifyAdminsOfApplication(newUser).catch(() => {});
    const verification = await sendVerification(newUser).catch(() => ({ status: 'failed' }));
    notify(newUser, { type: 'account', title: 'Welcome to Pack&Go!', body: 'Verify your email to start booking moves.' });

    // The account exists either way; emailDelivery tells the app whether the verification email went out.
    return res.status(201).json({
      success: true,
      token,
      user: profileOf(newUser),
      emailDelivery: verification.status,
      ...(verification.devLink && { devVerifyLink: verification.devLink })
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
    // Same message for unknown email and wrong password, so attackers can't
    // probe which emails have accounts.
    const isMatch = user?.password ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    }
    // Only said after a correct password, so it can't be used to discover accounts.
    if (user.isBlocked) {
      return res.status(403).json({ success: false, code: 'blocked', message: 'This account has been blocked by Pack&Go. Contact support if you think this is a mistake.' });
    }

    const token = signToken(user);

    return res.json({ success: true, token, user: profileOf(user) });
  } catch {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password  { email }
// Always answers the same way so it can't be used to discover accounts.
// ─────────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const generic = { success: true, message: 'If an account exists for that email, a reset link is on its way.' };
  // Without an email server we can't send reset links. Say so honestly — and before looking the
  // account up, so the answer is the same for every address (no account discovery).
  if (!emailConfigured() && !isDev()) {
    return res.status(503).json({ success: false, code: 'email_not_configured', message: 'Password reset emails are unavailable right now. Please contact support.' });
  }
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
    const status = await sendEmail({ to: user.email, ...passwordResetEmail({ name: user.name, link, minutes: 30 }) });
    // A failed send is logged server-side; the reply stays generic so it can't reveal which emails have accounts.
    // Without SMTP in development, hand the link back so the flow is testable.
    res.json({ ...generic, ...(['not_configured', 'skipped'].includes(status) && isDev() && { devResetLink: link }) });
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
    const pwProblem = passwordProblem(password, { admin: isAdminUser(user) });
    if (pwProblem) return res.status(400).json({ success: false, message: pwProblem });

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: await bcrypt.hash(password, 12), emailVerified: true },
        $unset: { passwordResetTokenHash: '', passwordResetExpires: '' },
        $inc: { tokenVersion: 1 } // signs out every device that had the old password
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
  const { status, devLink } = await sendVerification(user);
  if (status === 'sent') return res.json({ success: true, emailDelivery: status, message: deliveryMessage(status, user.email) });
  if (devLink) {
    return res.json({ success: true, emailDelivery: status, message: 'Email is not set up on this development server — use the verify link in the banner instead.', devVerifyLink: devLink });
  }
  res.status(status === 'not_configured' ? 503 : 502).json({ success: false, code: `email_${status}`, emailDelivery: status, message: deliveryMessage(status, user.email) });
});

// PATCH /api/auth/me  { name, phone }  — keep your contact details current
// POST /api/auth/change-password { currentPassword, newPassword } — signed-in users only
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword) return res.status(400).json({ success: false, message: 'Enter your current password.' });
    if (!validatePassword(newPassword)) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    if (newPassword === currentPassword) return res.status(400).json({ success: false, message: 'Choose a password different from the current one.' });
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ success: false, message: 'Your current password is incorrect.' });
    }
    const pwProblem = passwordProblem(newPassword, { admin: isAdminUser(user) });
    if (pwProblem) return res.status(400).json({ success: false, message: pwProblem });
    // Bumping tokenVersion signs out every other device; this one gets a fresh token.
    const updated = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { password: await bcrypt.hash(newPassword, 12) }, $unset: { passwordResetTokenHash: '', passwordResetExpires: '' }, $inc: { tokenVersion: 1 } },
      { returnDocument: 'after' }
    );
    notify(user, { type: 'account', title: 'Your password was changed', body: "If this wasn't you, reset your password and contact Pack&Go support.", email: true });
    res.json({ success: true, message: 'Password changed. Other devices have been signed out.', token: signToken(updated) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not change your password.' });
  }
});

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
// Signs this token out on the server too, so a copied token stops working right away.
// ─────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  await revokeToken(req.user).catch(() => {});
  return res.json({ success: true, message: 'Logged out successfully.' });
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
  } catch {
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
  } catch {
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
});

export default router;
