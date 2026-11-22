// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Bookings priced from their items, admin blocking users, and admin removing marketplace listings.
// Throwaway accounts only; removed when the suite ends. Run with the API on :5001:  npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { call, login, makeUser, makeAdmin, cleanup, track, qaItems, runTag as TAG } from './_helpers.js';

after(cleanup);

const HSR = { lat: 12.9121, lng: 77.6446 };
const WHITEFIELD = { lat: 12.9698, lng: 77.75 };
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const bookBody = (extra) => ({ origin: 'HSR Layout, Bengaluru', destination: 'Whitefield, Bengaluru', originLocation: HSR, destinationLocation: WHITEFIELD, date: inDays(2), timeSlot: 'morning', contactPhone: '9876500000', ...extra });

test('a booking needs items, and its volume comes from those items', async () => {
  const cust = await makeUser();
  const empty = await call('/moves/book', { token: cust.token, method: 'POST', body: bookBody({ totalCuFt: 115 }) });
  assert.equal(empty.status, 400, 'no items → refused even with a volume');
  assert.equal(empty.body.code, 'no_items');

  const blank = await call('/moves/book', { token: cust.token, method: 'POST', body: bookBody({ items: [{ name: '  ', cuFt: 50 }] }) });
  assert.equal(blank.status, 400, 'nameless items do not count');

  // The browser claims 5 cu ft, but the items add up to 80: the server prices 80.
  const r = await call('/moves/book', { token: cust.token, method: 'POST', body: bookBody({ totalCuFt: 5, items: [...qaItems(50), { name: 'Desk', cuFt: 30 }] }) });
  assert.equal(r.status, 201, r.body.message);
  assert.equal(r.body.move.totalCuFt, 80);
});

test('admin can block a user: sessions end, sign-in refused, unblock restores access', async () => {
  const admin = await makeAdmin();
  const u = await makeUser();
  const other = await makeUser();

  assert.equal((await call(`/admin/users/${u.user._id}/block`, { token: other.token, method: 'POST', body: { reason: 'x' } })).status, 403, 'customers cannot block');
  assert.equal((await call(`/admin/users/${u.user._id}/block`, { token: admin.token, method: 'POST', body: {} })).status, 400, 'reason required');
  assert.equal((await call(`/admin/users/${admin.user._id}/block`, { token: admin.token, method: 'POST', body: { reason: 'x' } })).status, 403, 'the admin cannot be blocked');

  const b = await call(`/admin/users/${u.user._id}/block`, { token: admin.token, method: 'POST', body: { reason: 'Fake listings' } });
  assert.equal(b.status, 200, b.body.message);
  assert.equal(b.body.user.isBlocked, true);
  assert.equal((await call(`/admin/users/${u.user._id}/block`, { token: admin.token, method: 'POST', body: { reason: 'again' } })).status, 409);

  assert.equal((await call('/auth/me', { token: u.token })).status, 401, 'open session ended');
  const denied = await call('/auth/login', { method: 'POST', body: { email: u.email, password: u.password } });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, 'blocked');
  const wrong = await call('/auth/login', { method: 'POST', body: { email: u.email, password: 'wrong-password' } });
  assert.equal(wrong.status, 401, 'a wrong password does not reveal the block');

  const list = await call(`/admin/users?filter=blocked&q=${encodeURIComponent(u.email)}`, { token: admin.token });
  assert.equal(list.status, 200);
  assert.equal(list.body.users.length, 1);
  assert.equal(list.body.users[0].blocked.reason, 'Fake listings');

  assert.equal((await call(`/admin/users/${u.user._id}/unblock`, { token: admin.token, method: 'POST' })).status, 200);
  const back = await login(u.email, u.password);
  assert.equal((await call('/auth/me', { token: back.token })).status, 200);
});

test('admin can remove a listing (hidden, seller locked out of editing) and restore it', async () => {
  const admin = await makeAdmin();
  const seller = await makeUser({ userType: 'outgoing' });
  const listed = await call('/marketplace', { token: seller.token, method: 'POST', body: { title: `${TAG} chair`, price: 300, category: 'Furniture', society: 'QA Tower' } });
  assert.equal(listed.status, 201, listed.body.message);
  const id = listed.body.item.itemId;
  track.item(id);
  const visible = async () => (await call('/marketplace')).body.items.some((i) => i.itemId === id);
  assert.equal(await visible(), true);

  assert.equal((await call(`/admin/listings/${id}/remove`, { token: seller.token, method: 'POST', body: { reason: 'x' } })).status, 403, 'sellers cannot use admin removal');
  const rm = await call(`/admin/listings/${id}/remove`, { token: admin.token, method: 'POST', body: { reason: 'Prohibited item' } });
  assert.equal(rm.status, 200, rm.body.message);
  assert.equal(rm.body.listing.status, 'removed');
  assert.equal(await visible(), false, 'hidden from the public marketplace');
  assert.equal((await call('/marketplace?status=removed')).body.items.some((i) => i.itemId === id), false, 'cannot be listed publicly by status');
  assert.equal((await call(`/marketplace/${id}`, { token: seller.token, method: 'PATCH', body: { price: 10 } })).status, 409, 'seller cannot edit it back');
  assert.equal((await call(`/marketplace/${id}/claim`, { token: admin.token, method: 'POST' })).status >= 400, true, 'cannot be claimed');

  const rs = await call(`/admin/listings/${id}/restore`, { token: admin.token, method: 'POST' });
  assert.equal(rs.status, 200, rs.body.message);
  assert.equal(rs.body.listing.status, 'available');
  assert.equal(await visible(), true);
});

test('refund rule: a captain no-show (no pickup 3 h after the slot start) refunds in full', async () => {
  const { refundPercentFor } = await import('../services/pricing.js');
  const now = Date.now();
  const slot = (h) => new Date(now + h * 3_600_000);
  const assigned = { status: 'assigned', assignedCaptainEmail: 'cap@test.local' };
  assert.equal(refundPercentFor({ ...assigned, moveDate: slot(30) }, now), 100, '24 h+ before');
  assert.equal(refundPercentFor({ ...assigned, moveDate: slot(10) }, now), 50, '4–24 h before');
  assert.equal(refundPercentFor({ ...assigned, moveDate: slot(1) }, now), 0, 'under 4 h before');
  assert.equal(refundPercentFor({ ...assigned, moveDate: slot(-1) }, now), 0, 'slot running, captain may still arrive');
  assert.equal(refundPercentFor({ ...assigned, moveDate: slot(-4) }, now), 100, 'no pickup 3 h after the slot start');
  assert.equal(refundPercentFor({ ...assigned, moveDate: slot(-4), pickupVerifiedAt: slot(-3.5) }, now), 0, 'picked up: no refund');
  assert.equal(refundPercentFor({ status: 'confirmed', moveDate: slot(1) }, now), 100, 'no captain yet');
});
