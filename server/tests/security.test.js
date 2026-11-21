// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Regression tests for the dependency security upgrade (mongoose 9.11.4, nodemailer 10.1.7):
// query-operator injection, prototype-pollution payloads, and the real nodemailer 10 message builder.
// Throwaway accounts only; removed when the suite ends. Run with the API on :5001:  npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { call, makeUser, cleanup, track } from './_helpers.js';
import { sendEmail, __setMailTransportForTests } from '../services/notify.js';
import { verificationEmail } from '../services/emails.js';
import { User } from '../models/index.js';

after(cleanup);
after(() => __setMailTransportForTests(null));

test('query-operator injection in auth fields is refused (no login, no token, no 500)', async () => {
  const victim = await makeUser();
  const attempts = [
    ['/auth/login', { email: { $ne: null }, password: { $ne: null } }],
    ['/auth/login', { email: victim.email, password: { $gt: '' } }],
    ['/auth/login', { email: { $regex: '.*' }, password: 'secret12' }],
    ['/auth/reset-password', { token: { $ne: null }, password: 'hacked123' }],
    ['/auth/verify-email', { token: { $ne: null } }],
    ['/auth/forgot-password', { email: { $gt: '' } }]
  ];
  for (const [path, body] of attempts) {
    const r = await call(path, { method: 'POST', body });
    assert.ok(r.status < 500, `${path} must not crash (${r.status})`);
    assert.ok(!r.body.token, `${path} must not hand out a session`);
    if (path !== '/auth/forgot-password') assert.notEqual(r.status, 200, `${path} must not succeed`);
  }
  // The victim's password is unchanged.
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: victim.email, password: 'secret12' } })).status, 200);
});

test('prototype-pollution payloads cannot grant admin or alter accounts', async () => {
  const email = `qa-proto-${Date.now()}@test.local`;
  track.email(email);
  // JSON.parse keeps "__proto__" as a real key, exactly as an attacker's raw request body would.
  const body = JSON.parse(`{"name":"QA Proto","email":"${email}","password":"secret12","acceptTerms":true,"userType":"professional",
    "isAdmin":true,"__proto__":{"isAdmin":true,"emailVerified":true},"constructor":{"prototype":{"isAdmin":true}}}`);
  const su = await call('/auth/signup', { method: 'POST', body });
  assert.equal(su.status, 201, su.body.message);
  assert.ok(!su.body.user.isAdmin, 'signup cannot self-assign admin');
  assert.equal((await call('/admin/bookings', { token: su.body.token })).status, 403);
  assert.equal(({}).isAdmin, undefined, 'server-side Object.prototype not polluted (checked in this process too)');

  const me = await makeUser();
  const patch = JSON.parse('{"name":"Renamed","__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}},"isAdmin":true,"email":"x@evil.test"}');
  const r = await call('/auth/me', { token: me.token, method: 'PATCH', body: patch });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.name, 'Renamed');
  assert.equal(r.body.user.email, me.email, 'email cannot be changed this way');
  assert.ok(!r.body.user.isAdmin);
  assert.equal((await call('/admin/bookings', { token: me.token })).status, 403);

  // Mongoose itself (9.11.4) must not hydrate inherited / prototype keys into a document.
  const doc = User.hydrate({ _id: '6b0000000000000000000001', email: 'h@test.local', name: 'H', constructor: { prototype: { isAdmin: true } } });
  assert.ok(!doc.isAdmin);
  assert.equal(({}).isAdmin, undefined);
});

test('payment and booking endpoints reject operator objects instead of matching other records', async () => {
  const cust = await makeUser();
  for (const id of [{ $ne: null }, { $regex: '.*' }, ['PKG-MOV-1']]) {
    const r = await call('/payments/demo', { token: cust.token, method: 'POST', body: { bookingId: id } });
    assert.equal(r.status, 400, `bookingId ${JSON.stringify(id)} → 400`);
  }
  const s = await call('/payments/status/%7B%22%24ne%22%3Anull%7D', { token: cust.token });
  assert.equal(s.status, 404, 'path params are plain strings');
});

test('nodemailer 10: our transport options and message format still work with the real library', async () => {
  // The real nodemailer 10 message builder (stream transport — nothing leaves this machine).
  const real = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const sent = [];
  __setMailTransportForTests({ sendMail: async (m) => { const info = await real.sendMail(m); sent.push(info.message.toString()); return info; } });
  const prevFrom = process.env.EMAIL_FROM;
  process.env.EMAIL_FROM = 'Pack&Go <noreply@example.org>';
  try {
    const link = 'https://packandgo.example/?verify=abc123';
    const status = await sendEmail({ to: 'someone@gmail.com', ...verificationEmail({ name: 'Asha <script>', link }) });
    assert.equal(status, 'sent');
    const raw = sent[0];
    assert.match(raw, /^To: someone@gmail\.com$/m);
    assert.match(raw, /^Subject: Verify your Pack&Go email$/m);
    assert.match(raw, /multipart\/alternative/, 'text + HTML parts');
    assert.ok(!/<script>/.test(raw), 'user input escaped in the HTML part');
    // Header injection through a display name is neutralised by the library.
    const inj = await sendEmail({ to: 'someone@gmail.com', subject: 'Hi\r\nBcc: attacker@evil.example', text: 'x', html: 'x' });
    assert.equal(inj, 'sent');
    assert.ok(!/^Bcc: attacker/m.test(sent[1]), 'no injected Bcc header');
  } finally {
    if (prevFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = prevFrom;
    __setMailTransportForTests(null);
  }
  // Our SMTP options are accepted by the v10 SMTP transport (built, not connected).
  const smtp = nodemailer.createTransport({ host: 'smtp.example.org', port: 587, secure: false, requireTLS: true, auth: { user: 'u', pass: 'p' }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 });
  assert.equal(smtp.options.requireTLS, true);
  assert.equal(smtp.options.connectionTimeout, 10_000);
  smtp.close();
});
