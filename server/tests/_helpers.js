// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Shared helpers for the API test suites. Tests create their own throwaway accounts and remove
// everything those accounts touched afterwards, so the demo data and homepage stats stay clean.
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const B = process.env.API_URL || 'http://localhost:5001/api';

export const call = async (path, { token, method = 'GET', body } = {}) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

/** Signs in a seeded demo account (read-only checks only — never create data with these). */
export const login = async (email, password = 'demo1234') => {
  const r = await call('/auth/login', { method: 'POST', body: { email, password } });
  assert.ok(r.body.token, `login ${email}: ${r.body.message}`);
  return r.body;
};

const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
let seq = 0;
const tracked = { emails: new Set(), items: new Set(), boxes: new Set(), hubs: new Set() };
export const track = {
  email: (e) => tracked.emails.add(e),
  item: (id) => tracked.items.add(id),
  box: (id) => tracked.boxes.add(id),
  hub: (id) => tracked.hubs.add(id)
};

/** Creates a verified throwaway account. Extra fields go straight to /auth/signup. */
export const makeUser = async (extra = {}, { verify = true } = {}) => {
  const email = `qa-${run}-${++seq}@test.local`;
  track.email(email);
  const su = await call('/auth/signup', {
    method: 'POST',
    body: { name: `QA User ${seq}`, email, password: 'secret12', acceptTerms: true, userType: 'professional', ...extra }
  });
  assert.equal(su.status, 201, `signup: ${su.body.message}`);
  if (verify && su.body.devVerifyLink) {
    const token = new URL(su.body.devVerifyLink).searchParams.get('verify');
    assert.equal((await call('/auth/verify-email', { method: 'POST', body: { token } })).status, 200);
  }
  return { ...su.body, email, password: 'secret12' };
};

/** Creates a driver application and, when `approve` is set, has the admin approve it. */
export const makeCaptain = async ({ approve = true } = {}) => {
  const n = String(++seq).padStart(4, '0');
  const cap = await makeUser({
    userType: 'captain',
    name: `QA Driver ${n}`,
    phone: `91${run.slice(-4)}${n}`.slice(0, 10),
    licenseNumber: `KA0120200${n}${run.slice(-2)}`,
    vehicleNumber: `KA01QA${n}`
  });
  if (approve) {
    const admin = await login('admin@packandgo.in');
    const r = await call(`/admin/captains/${cap.user._id}/review`, { token: admin.token, method: 'POST', body: { action: 'approve' } });
    assert.equal(r.status, 200, `approve: ${r.body.message}`);
  }
  return cap;
};

/** Removes every record the throwaway accounts created or touched. */
export const cleanup = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packandgo');
  const db = mongoose.connection.db;
  const emails = [...tracked.emails];
  const ids = (await db.collection('users').find({ email: { $in: emails } }).project({ _id: 1 }).toArray()).map((u) => u._id);
  const convs = (await db.collection('conversations').find({ participants: { $in: ids } }).project({ _id: 1 }).toArray()).map((c) => c._id);
  const items = [...tracked.items];
  const bookingIds = (await db.collection('movebookings').find({ userEmail: { $in: emails } }).project({ bookingId: 1 }).toArray()).map((b) => b.bookingId);

  await Promise.all([
    db.collection('messages').deleteMany({ conversation: { $in: convs } }),
    db.collection('conversations').deleteMany({ _id: { $in: convs } }),
    db.collection('notifications').deleteMany({ $or: [{ user: { $in: ids } }, { bookingId: { $in: bookingIds } }, { title: { $regex: `qa-${run}|QA-${run}` } }] }),
    db.collection('movebookings').deleteMany({ userEmail: { $in: emails } }),
    db.collection('damageclaims').deleteMany({ userEmail: { $in: emails } }),
    db.collection('servicerequests').deleteMany({ userEmail: { $in: emails } }),
    db.collection('luggagepassports').deleteMany({ $or: [{ userEmail: { $in: emails } }, { boxId: { $in: [...tracked.boxes] } }] }),
    db.collection('marketplaceitems').deleteMany({ $or: [{ itemId: { $in: items } }, { 'seller.email': { $in: emails } }] }),
    db.collection('campushubs').updateMany({}, { $pull: { members: { email: { $in: emails } } } })
  ]);
  await db.collection('users').deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
};

export const runTag = `QA-${run}`;
