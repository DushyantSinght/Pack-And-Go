// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Per-role API checks: what each kind of user can and cannot do. Run with the API on :5001:  npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { call, login, makeUser, makeCaptain, cleanup, track, runTag as TAG } from './_helpers.js';

// Data-creating checks use throwaway accounts; demo accounts are only signed in for read-only checks.
after(cleanup);

test('visitor: public pages work, private data is refused', async () => {
  for (const p of ['/stats', '/marketplace', '/payments/config', '/assistant/status']) {
    assert.equal((await call(p)).status, 200, p);
  }
  for (const p of ['/passports', '/campus', '/notifications', '/moves/mine', '/chat/conversations', '/admin/bookings']) {
    assert.equal((await call(p)).status, 401, p);
  }
});

test('customer: box passports are private to their owner', async () => {
  const cust = await makeUser();
  const other = await makeUser();
  const cap = await login('captain.harpreet@packandgo.in');

  const made = await call('/passports', { token: cust.token, method: 'POST', body: { label: `${TAG} box`, category: 'Kitchen', items: ['Plates', 'Mugs'], fragile: true } });
  assert.equal(made.status, 201);
  const box = made.body.box;
  track.box(box.boxId);
  assert.equal(box.userEmail, cust.email);
  assert.deepEqual(Object.keys(JSON.parse(box.qrDataString)).sort(), ['bookingId', 'boxId'], 'QR carries box + booking for the scanner');

  const mine = await call('/passports', { token: cust.token });
  assert.ok(mine.body.passports.every((b) => b.userEmail === cust.email), 'only own boxes listed');
  const theirs = await call('/passports', { token: other.token });
  assert.ok(!theirs.body.passports.some((b) => b.boxId === box.boxId), "another customer can't list it");
  assert.equal((await call(`/passports/${box.boxId}`, { token: other.token })).status, 404, "another customer can't read it");
  assert.equal((await call(`/passports/${box.boxId}`, { token: other.token, method: 'PATCH', body: { label: 'hacked' } })).status, 404, "another customer can't edit it");

  const patched = await call(`/passports/${box.boxId}`, { token: cust.token, method: 'PATCH', body: { label: `${TAG} renamed`, userEmail: 'x@y.z', status: 'delivered' } });
  assert.equal(patched.body.box.label, `${TAG} renamed`);
  assert.equal(patched.body.box.userEmail, cust.email, 'owner field cannot be changed');

  // A captain only sees boxes on jobs they've accepted.
  const capList = await call('/passports', { token: cap.token });
  assert.equal(capList.status, 200);
  assert.ok(!capList.body.passports.some((b) => b.boxId === box.boxId), "a captain not on the job can't see it");
});

test('campus: hub list never exposes other students; joining is idempotent', async () => {
  const cust = await makeUser({ userType: 'student' });
  const hubs = await call('/campus', { token: cust.token });
  assert.equal(hubs.status, 200);
  assert.ok(hubs.body.hubs.length > 0);
  assert.ok(hubs.body.hubs.every((h) => !('members' in h) && typeof h.memberCount === 'number'), 'no member details');
  const id = hubs.body.hubs[0].hubId;
  const first = await call(`/campus/${id}/join`, { token: cust.token, method: 'POST', body: {} });
  assert.equal(first.status, 200);
  const again = await call(`/campus/${id}/join`, { token: cust.token, method: 'POST', body: {} });
  assert.equal(again.body.alreadyJoined, true);
});

test('corridors: only the corridor’s own approved driver can verify stops', async () => {
  const cust = await makeUser();
  const harpreet = await login('captain.harpreet@packandgo.in');
  const manju = await login('captain.manju@packandgo.in');
  const path = '/corridors/blr-koramangala-whitefield/verify-stop';
  assert.equal((await call(path, { token: cust.token, method: 'POST', body: { stopId: 1 } })).status, 403, 'customer');
  assert.equal((await call(path, { token: harpreet.token, method: 'POST', body: { stopId: 1 } })).status, 403, 'other captain');
  assert.equal((await call(path, { token: manju.token, method: 'POST', body: { stopId: 1 } })).status, 200, 'assigned driver');
});

test('seller ↔ buyer: listing, no self-claim, claim notifies the seller, chat works', async () => {
  const seller = await makeUser();
  const buyer = await makeUser();
  const listed = await call('/marketplace', { token: seller.token, method: 'POST', body: { title: `${TAG} lamp`, price: 450, category: 'Furniture', society: 'QA Tower' } });
  assert.equal(listed.status, 201);
  const item = listed.body.item;
  track.item(item.itemId);
  assert.equal(item.mine, true, 'seller sees it as their own');
  assert.equal(item.seller.email, undefined, 'seller contact details stay private');
  assert.equal(item.imageUrl, '', 'no fake stock photo');
  assert.equal(item.originalPrice, 450, 'no made-up "was" price');
  assert.equal((await call('/marketplace', { token: seller.token, method: 'POST', body: { title: ' ', price: 100 } })).status, 400, 'title required');
  assert.equal((await call('/marketplace', { token: seller.token, method: 'POST', body: { title: 'Free?', price: -5 } })).status, 400, 'price must be positive');

  assert.equal((await call(`/marketplace/${item.itemId}/claim`, { token: seller.token, method: 'POST' })).status, 409, "seller can't claim own listing");

  const chat = await call('/chat/conversations', { token: buyer.token, method: 'POST', body: { contextType: 'seller', refId: item.itemId } });
  assert.equal(chat.status, 200);
  assert.equal(chat.body.conversation.otherUser.email, seller.email);
  const sent = await call(`/chat/conversations/${chat.body.conversation._id}/messages`, { token: buyer.token, method: 'POST', body: { text: 'Is the lamp still available?' } });
  assert.ok([200, 201].includes(sent.status), `send message: ${sent.body.message}`);

  const claim = await call(`/marketplace/${item.itemId}/claim`, { token: buyer.token, method: 'POST' });
  assert.equal(claim.status, 200);
  assert.equal(claim.body.item.claimedByMe, true);

  // Nobody browsing can see contact details of sellers or buyers.
  const pub = await call('/marketplace');
  assert.ok(pub.body.items.every((i) => !i.claimedBy && !i.seller?.email && !i.seller?.phone), 'public list has no contact details');
  const asSeller = await call('/marketplace', { token: seller.token });
  const mineNow = asSeller.body.items.find((i) => i.itemId === item.itemId);
  assert.ok(mineNow.mine && mineNow.claimedBy?.name && !mineNow.claimedBy.email, 'seller sees who claimed (name only)');
  assert.equal((await call(`/marketplace/${item.itemId}/claim`, { token: buyer.token, method: 'POST' })).status, 409, 'cannot claim twice');

  await new Promise((r) => setTimeout(r, 300));
  const notes = await call('/notifications', { token: seller.token });
  assert.ok(notes.body.notifications.some((n) => n.title.includes(`${TAG} lamp`)), 'seller notified of the claim');
});

test('captain: approved can work, pending is blocked, neither sees OTPs or admin', async () => {
  const cap = await login('captain.manju@packandgo.in');
  const jobs = await call('/moves/captain/jobs', { token: cap.token });
  assert.equal(jobs.status, 200);
  assert.ok(jobs.body.jobs.every((j) => !('pickupOtp' in j) && !('deliveryOtp' in j)), 'no OTPs in job list');
  assert.equal((await call('/admin/bookings', { token: cap.token })).status, 403);

  const su = await makeCaptain({ approve: false });
  assert.equal(su.user.captainStatus, 'pending');
  assert.equal(su.user.rating, null, 'a new driver has no made-up rating');
  const blocked = await call('/moves/captain/jobs', { token: su.token });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'captain_pending');
});

test('parent: account works, cannot use captain or admin tools', async () => {
  const su = await makeUser({ userType: 'parent' });
  assert.equal(su.user.userType, 'parent');
  assert.equal((await call('/auth/me', { token: su.token })).body.user.userType, 'parent');
  assert.equal((await call('/moves/captain/jobs', { token: su.token })).status, 403);
  assert.equal((await call('/admin/captains', { token: su.token })).status, 403);
});

test('admin: every operations list loads; customers are refused', async () => {
  const admin = await login('admin@packandgo.in');
  const cust = await makeUser();
  for (const p of ['/admin/bookings', '/admin/claims', '/admin/requests', '/admin/captains?status=pending', '/auth/users']) {
    assert.equal((await call(p, { token: admin.token })).status, 200, `admin ${p}`);
    assert.equal((await call(p, { token: cust.token })).status, 403, `customer ${p}`);
  }
});
