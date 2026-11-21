// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Notification fan-out: in-app (Mongo + live socket), email (SMTP) and SMS (Twilio).
// Email/SMS switch on automatically when their env vars are set. Without them, nothing is
// reported as "sent": email returns 'not_configured' and SMS is written to the server log.
import nodemailer from 'nodemailer';
import { Notification, User } from '../models/index.js';
import { emitToUsers } from '../socket.js';
import { notificationEmail } from './emails.js';

// ── Email (SMTP) ─────────────────────────────────────────────────
// Configured entirely from environment variables (see server/.env.example). Passwords and the
// links inside emails (verification / reset tokens) are never written to logs.
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };
const sendDeadlineMs = () => Number(process.env.EMAIL_SEND_TIMEOUT_MS) || 30_000; // whole-send cap on top of socket timeouts
let transport = null;
let transportKey = '';
let testTransport = null;

/** Tests only: route all email through a mock transport (or pass null to restore). */
export const __setMailTransportForTests = (t) => {
  testTransport = t;
  transport = null;
  transportKey = '';
};

/** "broath4@gmail.com" → "br•••@gmail.com" — enough to debug, not enough to leak. */
export const maskEmail = (addr = '') => {
  const [user, domain] = String(addr).split('@');
  return domain ? `${user.slice(0, 2)}•••@${domain}` : '•••';
};

/**
 * Reads the SMTP settings and reports what's missing. Never returns the password.
 * @returns {{configured: boolean, errors: string[], host?: string, port?: number, secure?: boolean, from?: string}}
 */
export const emailConfig = () => {
  const e = process.env;
  if (!e.SMTP_HOST) return { configured: false, errors: ['SMTP_HOST is not set'] };
  const errors = [];
  const port = Number(e.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('SMTP_PORT must be a port number (usually 465 or 587)');
  if (e.SMTP_USER && !e.SMTP_PASS) errors.push('SMTP_PASS is empty (for Gmail, use a 16-character App Password)');
  if (!e.SMTP_USER && e.SMTP_PASS) errors.push('SMTP_USER is empty');
  const from = e.EMAIL_FROM || e.SMTP_USER || '';
  if (!/@/.test(from)) errors.push('EMAIL_FROM is not set (e.g. "Pack&Go <you@gmail.com>")');
  const secure = e.SMTP_SECURE ? e.SMTP_SECURE === 'true' : port === 465;
  return { configured: errors.length === 0, errors, host: e.SMTP_HOST, port, secure, from };
};

export const emailConfigured = () => !!testTransport || emailConfig().configured;
export const smsConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

/** Links in emails point at the first CLIENT_URL (comma-separated list allowed). */
export const appUrl = (path = '') => `${(String(process.env.CLIENT_URL || '').split(',')[0].trim() || 'http://localhost:5173').replace(/\/$/, '')}${path}`;

const mailer = () => {
  if (testTransport) return testTransport;
  const cfg = emailConfig();
  if (!cfg.configured) return null;
  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${process.env.SMTP_USER || ''}`;
  if (transport && key === transportKey) return transport;
  transportKey = key;
  transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: !cfg.secure && cfg.port === 587, // never send credentials in clear text
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    ...TIMEOUTS
  });
  return transport;
};

/** Checks the SMTP login without sending anything (used by the test-email script). */
export const verifyEmailTransport = async () => {
  const t = mailer();
  if (!t) return { ok: false, reason: 'not_configured', errors: emailConfig().errors };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'failed', code: err.code, responseCode: err.responseCode };
  }
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { escapeHtml };

let warnedNotConfigured = false;

/** Reserved names that can never receive mail (RFC 2606 / 6761) — e.g. test accounts like qa@test.local. */
export const isUndeliverableAddress = (addr = '') => {
  const domain = String(addr).toLowerCase().split('@')[1] || '';
  return /\.(test|example|invalid|localhost|local)$/.test(domain) || /^(example\.(com|net|org)|localhost)$/.test(domain);
};

/**
 * Domains we never email even though they're real: the demo/fixture accounts use @packandgo.in,
 * which we don't own. Override with EMAIL_SUPPRESS_DOMAINS (comma list; set it empty to allow all).
 * Default applies outside production only.
 */
const suppressedDomains = () => {
  const raw = process.env.EMAIL_SUPPRESS_DOMAINS ?? (process.env.NODE_ENV === 'production' ? '' : 'packandgo.in');
  return raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
};
export const isSuppressedAddress = (addr = '') => suppressedDomains().includes(String(addr).toLowerCase().split('@')[1] || '');

/**
 * Sends one email.
 * @returns {Promise<'sent'|'not_configured'|'failed'|'skipped'>} — never claims 'sent' unless the
 *   SMTP server accepted the message. 'skipped' = no address, or a reserved test domain.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return 'skipped';
  if (isUndeliverableAddress(to) || isSuppressedAddress(to)) {
    // Test domains would only bounce back into the sender's inbox; demo domains aren't ours.
    console.log(`📧 [not sent — ${isUndeliverableAddress(to) ? 'reserved test domain' : 'suppressed demo domain'}] to ${maskEmail(to)} | ${subject}`);
    return 'skipped';
  }
  const t = mailer();
  if (!t) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      console.warn(`📧 Email is not configured (${emailConfig().errors.join('; ')}). Emails will NOT be delivered.`);
    }
    console.log(`📧 [not sent — email not configured] to ${maskEmail(to)} | ${subject}`);
    return 'not_configured';
  }
  try {
    const send = t.sendMail({
      from: emailConfig().from || process.env.EMAIL_FROM || 'Pack&Go <no-reply@packandgo.in>',
      to,
      subject,
      text,
      html: html || `<div style="font-family:system-ui,sans-serif;line-height:1.5">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`
    });
    let timer;
    const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('Email send timed out'), { code: 'ETIMEDOUT' })), sendDeadlineMs()); });
    await Promise.race([send, deadline]).finally(() => clearTimeout(timer));
    console.log(`📧 Sent "${subject}" to ${maskEmail(to)}`);
    return 'sent';
  } catch (err) {
    // Log the error class, not the message body or credentials.
    const hint = err.code === 'EAUTH' ? ' — check SMTP_USER / SMTP_PASS (Gmail needs an App Password)' : '';
    console.error(`📧 Email to ${maskEmail(to)} failed: ${err.code || 'ERROR'}${err.responseCode ? ` (SMTP ${err.responseCode})` : ''}${hint}`);
    return 'failed';
  }
};

/** Normalises Indian numbers to E.164. */
export const e164 = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `+91${d}`;
  if (d.length === 12 && d.startsWith('91')) return `+${d}`;
  return null;
};

export const sendSms = async ({ to, body }) => {
  const num = e164(to);
  if (!num) return 'skipped';
  if (!smsConfigured()) {
    console.log(`📱 [sms not configured — not sent] to ••••••${num.slice(-4)} | ${body.slice(0, 80)}`);
    return 'logged';
  }
  try {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: num, From: from, Body: body.slice(0, 600) })
    });
    if (!res.ok) throw new Error(`Twilio HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return 'sent';
  } catch (err) {
    console.error('SMS send failed:', err.message);
    return 'failed';
  }
};

/**
 * Notify one user on every channel that makes sense.
 * @param {string|object} who  user id, email, or a user document
 * @param {{type,title,body,bookingId,email?:boolean,sms?:boolean,emailSubject?:string}} n
 */
export const notify = async (who, n) => {
  try {
    const user =
      typeof who === 'object' && who?._id
        ? who
        : await User.findOne(String(who).includes('@') ? { email: String(who).toLowerCase() } : { _id: who }).lean();
    if (!user) return null;

    const channels = {};
    if (n.email) {
      channels.email = await sendEmail({ to: user.email, ...notificationEmail({ name: user.name, title: n.title, body: n.body, subject: n.emailSubject }) });
    }
    if (n.sms) channels.sms = await sendSms({ to: user.phone, body: `Pack&Go: ${n.title}${n.body ? ` — ${n.body}` : ''}` });

    const doc = await Notification.create({
      user: user._id,
      type: n.type || 'info',
      title: n.title,
      body: n.body,
      bookingId: n.bookingId,
      channels
    });
    emitToUsers([String(user._id)], 'notification', {
      _id: String(doc._id),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      bookingId: doc.bookingId,
      read: false,
      createdAt: doc.createdAt
    });
    return doc;
  } catch (err) {
    console.error('notify failed:', err.message);
    return null;
  }
};
