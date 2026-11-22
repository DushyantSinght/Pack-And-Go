// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Pre-deployment hardening: the single fixed admin, sign-out/password-change revoking sessions,
// and endpoints that must not leak database details. Throwaway accounts only; removed at the end.
// Run with the API on :5001:  npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { call, login, makeUser, makeAdmin, cleanup } from './_helpers.js';
import { isAdminUser } from '../middleware/roles.js';
import { isReservedAdminEmail } from '../services/adminAccount.js';

after(cleanup);

test('nobody can register as admin', async () => {
  const u = await makeUser({ isAdmin: true, userType: 'admin' });
  assert.equal(u.user.isAdmin, false, 'signup ignores isAdmin');
  assert.equal((await call('/admin/captains', { token: u.token })).status, 403);

  // An admin email list no longer grants admin rights: only the isAdmin flag does.
  const before = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = 'someone@example.com';
  assert.equal(isAdminUser({ email: 'someone@example.com', isAdmin: false, emailVerified: true }), false);
  assert.equal(isAdminUser({ email: 'x@example.com', isAdmin: true, emailVerified: true }), true);
  assert.equal(isAdminUser({ email: 'x@example.com', isAdmin: true, emailVerified: false }), false, 'unverified is never admin');
  process.env.ADMIN_EMAILS = before;
});

test('the configured admin email is reserved (case-insensitive)', () => {
  const before = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = 'Owner@Example.com';
  assert.equal(isReservedAdminEmail(' owner@example.COM '), true);
  assert.equal(isReservedAdminEmail('other@example.com'), false);
  delete process.env.ADMIN_EMAIL;
  assert.equal(isReservedAdminEmail('owner@example.com'), false, 'nothing reserved when unset');
  if (before !== undefined) process.env.ADMIN_EMAIL = before;
});

test('the old demo admin has no admin rights', async () => {
  const r = await call('/auth/login', { method: 'POST', body: { email: 'admin@packandgo.in', password: 'demo1234' } });
  if (r.status !== 200) return; // account doesn't exist on this database: nothing to check
  assert.equal(r.body.user.isAdmin, false);
  assert.equal((await call('/admin/captains', { token: r.body.token })).status, 403);
});

test('signing out revokes the token on the server', async () => {
  const u = await makeUser();
  assert.equal((await call('/auth/me', { token: u.token })).status, 200);
  assert.equal((await call('/auth/logout', { token: u.token, method: 'POST' })).status, 200);
  assert.equal((await call('/auth/me', { token: u.token })).status, 401, 'a signed-out token is refused');
  // Signing in again gives a working token.
  const again = await login(u.email, u.password);
  assert.equal((await call('/auth/me', { token: again.token })).status, 200);
});

test('changing the password signs out every other session', async () => {
  const u = await makeUser();
  const other = await login(u.email, u.password);
  const r = await call('/auth/change-password', { token: u.token, method: 'POST', body: { currentPassword: u.password, newPassword: 'newsecret34' } });
  assert.equal(r.status, 200, r.body.message);
  assert.ok(r.body.token, 'this device gets a fresh token');
  assert.equal((await call('/auth/me', { token: r.body.token })).status, 200);
  assert.equal((await call('/auth/me', { token: u.token })).status, 401, 'old token on this device is refused');
  assert.equal((await call('/auth/me', { token: other.token })).status, 401, 'other device is signed out');
});

test('health is public and lightweight; database details are admin-only', async () => {
  const h = await call('/health');
  assert.equal(h.status, 200);
  assert.deepEqual(h.body, { ok: true });

  const root = await call('');
  assert.equal(root.status, 200);
  assert.equal(JSON.stringify(root.body).includes('host'), false, 'API root does not reveal the database host');

  assert.equal((await call('/database/status')).status, 401, 'anonymous');
  const u = await makeUser();
  assert.equal((await call('/database/status', { token: u.token })).status, 403, 'customer');
  const admin = await makeAdmin();
  const s = await call('/database/status', { token: admin.token });
  assert.equal(s.status, 200);
  assert.ok(s.body.collections?.users, 'admin sees collection counts');
});
