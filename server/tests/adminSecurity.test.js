// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Admin privilege escalation: nobody becomes admin by registering, editing their profile, resetting
// a password, or sending extra fields; an unverified account never gets admin. Throwaway accounts only (removed at the end). The real admin account is
// never touched: ensureAdminAccount is only exercised on paths that return before any write.
// Run with the API on :5001:  npm test
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { call, makeUser, cleanup } from './_helpers.js';
import { isAdminUser } from '../middleware/roles.js';
import { ensureAdminAccount } from '../services/adminAccount.js';
import { passwordProblem } from '../services/passwordPolicy.js';

const DB = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packandgo';
const users = () => mongoose.connection.db.collection('users');
before(async () => { if (mongoose.connection.readyState !== 1) await mongoose.connect(DB); });
after(cleanup);

/** Runs fn with some environment variables temporarily set (undefined = unset), then restores them. */
const withEnv = async (vars, fn) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  const apply = (obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
  apply(vars);
  try { return await fn(); } finally { apply(saved); }
};
const quietLog = { log() {}, error() {} };

test('registration cannot grant admin, verification, captain approval or a session version', async () => {
  const u = await makeUser(
    { isAdmin: true, emailVerified: true, tokenVersion: 99, isBlocked: false, captain: { status: 'approved' }, userType: 'admin', blocked: { reason: 'x' } },
    { verify: false }
  );
  assert.equal(u.user.isAdmin, false);
  const row = await users().findOne({ email: u.email });
  assert.equal(row.isAdmin, false);
  assert.equal(row.emailVerified, false, 'signup never marks the email verified');
  assert.equal(row.tokenVersion || 0, 0);
  assert.notEqual(row.userType, 'admin');
  assert.equal((await call('/admin/users', { token: u.token })).status, 403);
});

test('profile updates and password reset ignore admin and verification fields', async () => {
  const u = await makeUser();
  const p = await call('/auth/me', { token: u.token, method: 'PATCH', body: { name: 'QA Renamed', isAdmin: true, emailVerified: true, userType: 'captain', $set: { isAdmin: true }, __proto__: { isAdmin: true } } });
  assert.equal(p.status, 200, p.body.message);
  assert.equal(p.body.user.isAdmin, false);
  assert.equal(p.body.user.userType, 'professional');
  assert.equal((await users().findOne({ email: u.email })).isAdmin, false);

  const fp = await call('/auth/forgot-password', { method: 'POST', body: { email: u.email } });
  assert.equal(fp.status, 200);
  if (fp.body.devResetLink) {
    const token = new URL(fp.body.devResetLink).searchParams.get('reset');
    const r = await call('/auth/reset-password', { method: 'POST', body: { token, password: 'fresh-pass-42', isAdmin: true, email: 'someone-else@test.local' } });
    assert.equal(r.status, 200, r.body.message);
    assert.equal((await users().findOne({ email: u.email })).isAdmin, false);
    assert.equal((await call('/admin/users', { token: u.token })).status, 401, 'reset ended the old session');
  } else {
    assert.equal((await call('/admin/users', { token: u.token })).status, 403);
  }
});

test('an unverified account with the admin flag still has no admin access', async () => {
  const u = await makeUser({}, { verify: false });
  // Simulate a stale or tampered flag directly in the database.
  await users().updateOne({ email: u.email }, { $set: { isAdmin: true } });
  assert.equal((await call('/admin/users', { token: u.token })).status, 403, 'verification is required for admin');
  assert.equal((await call('/auth/me', { token: u.token })).body.user.isAdmin, false);
  await users().updateOne({ email: u.email }, { $set: { isAdmin: false } });
});

test('the admin setup never promotes an unverified registration of the admin email', async () => {
  const u = await makeUser({}, { verify: false });
  const r = await withEnv({ ADMIN_EMAIL: u.email, ADMIN_PASSWORD: 'irrelevant-strong-pass' }, () => ensureAdminAccount({ log: quietLog }));
  assert.equal(r.status, 'unverified');
  assert.equal((await users().findOne({ email: u.email })).isAdmin, false);
});

test('the admin setup creates nothing without ADMIN_PASSWORD or with one under 6 characters', async () => {
  const email = `qa-missing-admin-${Date.now()}@test.local`;
  const none = await withEnv({ NODE_ENV: 'production', ADMIN_EMAIL: email, ADMIN_PASSWORD: undefined }, () => ensureAdminAccount({ log: quietLog }));
  assert.equal(none.status, 'missing_password');
  const short = await withEnv({ NODE_ENV: 'production', ADMIN_EMAIL: email, ADMIN_PASSWORD: '12345' }, () => ensureAdminAccount({ log: quietLog }));
  assert.equal(short.status, 'weak_password');
  assert.equal(await users().countDocuments({ email }), 0, 'nothing was created');
});

test('production admin rule: flag + verified email + the configured ADMIN_EMAIL', async () => {
  const admin = { isAdmin: true, emailVerified: true, email: 'owner@example.com' };
  await withEnv({ NODE_ENV: 'production', ADMIN_EMAIL: 'Owner@Example.com' }, async () => {
    assert.equal(isAdminUser(admin), true);
    assert.equal(isAdminUser({ ...admin, email: 'other@example.com' }), false, 'a second flagged account is not admin');
    assert.equal(isAdminUser({ ...admin, emailVerified: false }), false);
    assert.equal(isAdminUser({ ...admin, isAdmin: false }), false);
  });
  await withEnv({ NODE_ENV: 'production', ADMIN_EMAIL: undefined }, async () => {
    assert.equal(isAdminUser(admin), false, 'no ADMIN_EMAIL in production → nobody is admin');
  });
});

test('password policy: ordinary users cannot pick common passwords; the admin may (owner choice)', async () => {
  assert.match(passwordProblem('123456'), /too common/);
  assert.match(passwordProblem('Demo1234'), /too common/);
  assert.equal(passwordProblem('secret12'), null);
  assert.match(passwordProblem('12345'), /at least 6/);
  await withEnv({ NODE_ENV: 'production' }, async () => {
    assert.equal(passwordProblem('123456', { admin: true }), null, 'owner chose a 6-digit admin password');
    assert.match(passwordProblem('12345', { admin: true }), /at least 6/);
  });
  // Signing up with a common password is refused.
  const r = await call('/auth/signup', { method: 'POST', body: { name: 'QA', email: `qa-common-${Date.now()}@test.local`, password: '123456', acceptTerms: true } });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /too common/);
});
