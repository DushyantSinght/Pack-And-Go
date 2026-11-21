// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Email delivery: configuration checks, honest statuses, timeouts, safe logging and templates.
// Uses a MOCK transport with SMTP settings cleared — no real email is ever sent from this file. The route checks at the end run against the
// live dev API (which has no working SMTP password) using throwaway accounts.
import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { sendEmail, emailConfig, emailConfigured, maskEmail, notify, __setMailTransportForTests } from '../services/notify.js';
import { verificationEmail, passwordResetEmail } from '../services/emails.js';
import { call, makeUser, cleanup } from './_helpers.js';

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'EMAIL_FROM', 'EMAIL_SEND_TIMEOUT_MS', 'EMAIL_SUPPRESS_DOMAINS'];
const saved = Object.fromEntries(SMTP_KEYS.map((k) => [k, process.env[k]]));
const resetEnv = () => SMTP_KEYS.forEach((k) => delete process.env[k]);

/** Captures everything written to the console while fn runs. */
const captureLogs = async (fn) => {
  const lines = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  for (const k of Object.keys(orig)) console[k] = (...a) => lines.push(a.join(' '));
  try { return { result: await fn(), logs: lines.join('\n') }; } finally { Object.assign(console, orig); }
};

beforeEach(() => { resetEnv(); __setMailTransportForTests(null); });
after(async () => {
  __setMailTransportForTests(null);
  resetEnv();
  for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
  await cleanup();
});

test('missing SMTP: clear config errors, nothing reported as sent, no email body in logs', async () => {
  assert.equal(emailConfigured(), false);
  assert.deepEqual(emailConfig().errors, ['SMTP_HOST is not set']);
  const link = 'http://localhost:5173/?verify=SECRET-TOKEN-123';
  const { result, logs } = await captureLogs(() => sendEmail({ to: 'someone@mailbox.in', ...verificationEmail({ name: 'Asha', link }) }));
  assert.equal(result, 'not_configured');
  assert.ok(!logs.includes('SECRET-TOKEN-123'), 'token never logged');
  assert.ok(!logs.includes('someone@mailbox.in'), 'recipient masked');
  assert.ok(logs.includes('so•••@mailbox.in'));
});

test('partial SMTP settings are reported precisely', () => {
  Object.assign(process.env, { SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465', SMTP_USER: 'sender@gmail.com', EMAIL_FROM: 'Pack&Go <sender@gmail.com>' });
  const cfg = emailConfig();
  assert.equal(cfg.configured, false);
  assert.ok(cfg.errors.some((e) => e.startsWith('SMTP_PASS is empty')), 'missing password named');
  process.env.SMTP_PORT = 'abc';
  assert.ok(emailConfig().errors.some((e) => e.startsWith('SMTP_PORT')));
  Object.assign(process.env, { SMTP_PORT: '465', SMTP_PASS: 'app-password-here' });
  const ok = emailConfig();
  assert.equal(ok.configured, true);
  assert.equal(ok.secure, true, '465 uses TLS');
  assert.ok(!JSON.stringify(ok).includes('app-password-here'), 'config summary never contains the password');
  process.env.SMTP_PORT = '587';
  assert.equal(emailConfig().secure, false, '587 uses STARTTLS');
});

test('mock transport: verification and reset emails carry the link, escape user input, and send', async () => {
  const outbox = [];
  __setMailTransportForTests({ sendMail: async (m) => { outbox.push(m); return { messageId: 'mock-1' }; } });
  const link = 'http://localhost:5173/?verify=abc123';
  const { result, logs } = await captureLogs(() => sendEmail({ to: 'new.user@mailbox.in', ...verificationEmail({ name: '<script>alert(1)</script> Ravi', link }) }));
  assert.equal(result, 'sent');
  const m = outbox[0];
  assert.equal(m.to, 'new.user@mailbox.in');
  assert.equal(m.subject, 'Verify your Pack&Go email');
  assert.ok(m.text.includes(link) && m.html.includes(link), 'link in text and HTML');
  assert.ok(!m.html.includes('<script>'), 'user input escaped in HTML');
  assert.ok(!logs.includes('abc123'), 'token not logged on success either');

  const r = passwordResetEmail({ name: 'Ravi', link: 'http://x/?reset=zzz', minutes: 30 });
  assert.ok(r.text.includes('30 minutes') && r.html.includes('http://x/?reset=zzz'));
});

test('mock transport: SMTP failure → "failed", logged by error code only (no secrets)', async () => {
  __setMailTransportForTests({
    sendMail: async () => { throw Object.assign(new Error('Invalid login: user=sender@gmail.com pass=hunter2'), { code: 'EAUTH', responseCode: 535 }); }
  });
  const { result, logs } = await captureLogs(() => sendEmail({ to: 'buyer@mailbox.in', subject: 'x', text: 'y' }));
  assert.equal(result, 'failed');
  assert.ok(logs.includes('EAUTH') && logs.includes('535'));
  assert.ok(!logs.includes('hunter2') && !logs.includes('buyer@mailbox.in'), 'no password or full address in logs');
});

test('mock transport: a hanging SMTP server times out instead of blocking', async () => {
  process.env.EMAIL_SEND_TIMEOUT_MS = '200';
  __setMailTransportForTests({ sendMail: () => new Promise(() => {}) });
  const t0 = Date.now();
  const { result, logs } = await captureLogs(() => sendEmail({ to: 'a@mailbox.in', subject: 's', text: 't' }));
  assert.equal(result, 'failed');
  assert.ok(Date.now() - t0 < 2000, 'gave up quickly');
  assert.ok(logs.includes('ETIMEDOUT'));
});

test('booking notifications use the template and record the real delivery result', async () => {
  const u = await makeUser();
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packandgo');
  const outbox = [];
  __setMailTransportForTests({ sendMail: async (m) => { outbox.push(m); } });
  const doc = await notify({ _id: u.user._id, email: 'qa.notify@mailbox.in', name: 'QA Tester', phone: '' }, { type: 'booking', bookingId: 'PKG-MOV-QA', title: 'Booking PKG-MOV-QA confirmed', body: '₹1,000 received.', email: true });
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].subject, 'Pack&Go: Booking PKG-MOV-QA confirmed');
  assert.ok(outbox[0].html.includes('Open Pack&amp;Go') || outbox[0].html.includes('Open Pack&Go'));
  assert.equal(doc.channels.email, 'sent');

  __setMailTransportForTests(null); // no SMTP → recorded honestly
  const doc2 = await captureLogs(() => notify({ _id: u.user._id, email: 'qa.notify@mailbox.in', name: 'QA' }, { title: 'Second', email: true }));
  assert.equal(doc2.result.channels.email, 'not_configured');
  await mongoose.disconnect();
});

test('API (dev) with a test address: sign-up, resend and reset never claim a send', async () => {
  const su = await makeUser({}, { verify: false });
  assert.ok(['not_configured', 'skipped'].includes(su.emailDelivery), `sign-up reports no send (${su.emailDelivery})`);
  assert.ok(su.devVerifyLink, 'dev link offered instead');
  const resend = await call('/auth/resend-verification', { token: su.token, method: 'POST' });
  assert.equal(resend.status, 200);
  assert.ok(['not_configured', 'skipped'].includes(resend.body.emailDelivery));
  assert.ok(!/sent to/i.test(resend.body.message), 'never claims it was sent');
  const fp = await call('/auth/forgot-password', { method: 'POST', body: { email: su.email } });
  assert.ok(fp.body.devResetLink, 'dev reset link offered');
  const unknown = await call('/auth/forgot-password', { method: 'POST', body: { email: 'nobody-here@example.com' } });
  assert.equal(unknown.body.message, fp.body.message, 'same answer for unknown emails');
});

test('reserved test domains are never emailed (they would only bounce)', async () => {
  const outbox = [];
  __setMailTransportForTests({ sendMail: async (m) => { outbox.push(m); } });
  for (const to of ['qa-1@test.local', 'a@example.com', 'b@foo.test', 'c@x.invalid']) {
    const { result } = await captureLogs(() => sendEmail({ to, subject: 's', text: 't' }));
    assert.equal(result, 'skipped', to);
  }
  assert.equal(outbox.length, 0);
  assert.equal(await sendEmail({ to: 'real.person@gmail.com', subject: 's', text: 't' }), 'sent');
  assert.equal(outbox.length, 1);
  // Demo accounts' domain is suppressed by default (dev), and the list is configurable.
  assert.equal((await captureLogs(() => sendEmail({ to: 'demo@packandgo.in', subject: 's', text: 't' }))).result, 'skipped');
  process.env.EMAIL_SUPPRESS_DOMAINS = '';
  assert.equal(await sendEmail({ to: 'demo@packandgo.in', subject: 's', text: 't' }), 'sent');
  assert.equal(outbox.length, 2);
});

test('mask helper', () => {
  assert.equal(maskEmail('broath4@gmail.com'), 'br•••@gmail.com');
  assert.equal(maskEmail(''), '•••');
});
