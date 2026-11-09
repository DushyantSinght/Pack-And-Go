// Notification fan-out: in-app (Mongo + live socket), email (SMTP) and SMS (Twilio).
// Email/SMS switch on automatically when their env vars are set. Without them,
// messages are written to the server log so nothing is silently "sent".
import nodemailer from 'nodemailer';
import { Notification, User } from '../models/index.js';
import { emitToUsers } from '../socket.js';

let transport = null;
const mailer = () => {
  if (transport !== null) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  transport = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
      })
    : false;
  return transport;
};

export const emailConfigured = () => !!process.env.SMTP_HOST;
export const smsConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

export const appUrl = (path = '') => `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}${path}`;

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return 'skipped';
  const t = mailer();
  if (!t) {
    console.log(`📧 [email not configured] To: ${to} | ${subject}\n    ${text.replace(/\n/g, '\n    ')}`);
    return 'logged';
  }
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || 'Pack&Go <no-reply@packandgo.in>',
      to,
      subject,
      text,
      html: html || `<div style="font-family:system-ui,sans-serif;line-height:1.5">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`
    });
    return 'sent';
  } catch (err) {
    console.error('Email send failed:', err.message);
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
    console.log(`📱 [sms not configured] To: ${num} | ${body}`);
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
      channels.email = await sendEmail({
        to: user.email,
        subject: n.emailSubject || `Pack&Go: ${n.title}`,
        text: `Hi ${user.name?.split(' ')[0] || 'there'},\n\n${n.title}\n${n.body || ''}\n\nOpen Pack&Go: ${appUrl()}\n\n— Team Pack&Go`
      });
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
