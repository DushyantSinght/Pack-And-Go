// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// End-to-end API test of the booking lifecycle. Run with the API on :5001:  npm test
// Every account here is a throwaway one, removed with all its bookings when the suite ends.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { call, login, makeUser, makeCaptain, cleanup } from './_helpers.js';

after(cleanup);
const tomorrow = () => new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);

const HSR = { lat: 12.9116, lng: 77.6474 };
const WHITEFIELD = { lat: 12.9698, lng: 77.75 };

test('full booking lifecycle: quote → book → pay → accept → pickup → deliver → review → claim', async () => {
  const cust = await makeUser();
  const cap = await makeCaptain();
  const rival = await makeCaptain();

  const q = await call('/moves/quote', { token: cust.token, method: 'POST', body: { totalCuFt: 115, originLocation: HSR, destinationLocation: WHITEFIELD } });
  assert.equal(q.status, 200);
  assert.ok(q.body.distanceKm > 5 && q.body.quote.total > q.body.quote.subtotal, 'quote has distance and GST');

  const bad = await call('/moves/book', { token: cust.token, method: 'POST', body: { origin: 'x', destination: 'y', date: tomorrow(), timeSlot: 'morning', totalCuFt: 115 } });
  assert.equal(bad.status, 400, 'addresses must be geocoded');

  const booked = await call('/moves/book', {
    token: cust.token, method: 'POST',
    body: { origin: 'HSR Layout Sector 1, Bengaluru', destination: 'Hope Farm, Whitefield, Bengaluru', originLocation: HSR, destinationLocation: WHITEFIELD, date: tomorrow(), timeSlot: 'morning', totalCuFt: 115, contactPhone: '9876500000', floorsOrigin: 3, hasLiftOrigin: false }
  });
  assert.equal(booked.status, 201, JSON.stringify(booked.body));
  const m = booked.body.move;
  assert.equal(m.status, 'pending_payment');
  assert.ok(m.priceBreakdown.floors > 0, 'stairs surcharge applied');

  const early = await call('/moves/captain/jobs', { token: cap.token });
  assert.ok(!early.body.jobs.some((j) => j.bookingId === m.bookingId), 'unpaid bookings are not offered to captains');

  const cfg = await call('/payments/config');
  if (cfg.body.testPayments) {
    const paid = await call('/payments/test-pay', { token: cust.token, method: 'POST', body: { bookingId: m.bookingId } });
    assert.equal(paid.status, 200);
  } else {
    return; // real gateway configured: payment can't be automated here
  }
  const again = await call('/payments/test-pay', { token: cust.token, method: 'POST', body: { bookingId: m.bookingId } });
  assert.equal(again.status, 409, 'cannot pay twice');

  const jobs = await call('/moves/captain/jobs', { token: cap.token });
  const job = jobs.body.jobs.find((j) => j.bookingId === m.bookingId);
  assert.ok(job && !job.userPhone && !('pickupOtp' in job), 'open job hides phone and OTPs');

  const early2 = await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.pickupOtp, stage: 'pickup' } });
  assert.equal(early2.status, 403, 'must accept before verifying');

  const acc = await call(`/moves/captain/jobs/${m.bookingId}/accept`, { token: cap.token, method: 'POST' });
  assert.equal(acc.status, 200);
  assert.ok(acc.body.job.userPhone, 'phone revealed after accepting');

  const steal = await call(`/moves/captain/jobs/${m.bookingId}/accept`, { token: rival.token, method: 'POST' });
  assert.equal(steal.status, 409, 'second captain cannot take an accepted job');

  assert.equal((await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.pickupOtp, stage: 'pickup' } })).status, 200);
  const cancelLate = await call(`/moves/${m.bookingId}/cancel`, { token: cust.token, method: 'POST', body: {} });
  assert.equal(cancelLate.status, 409, 'cannot cancel after pickup');

  const wallet = async () => (await call('/auth/me', { token: cap.token })).body.user.escrowWalletBalance || 0;
  const before = await wallet();
  assert.equal((await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.deliveryOtp, stage: 'delivery' } })).status, 200);
  assert.ok((await wallet()) > before, 'captain wallet credited on delivery');

  const rev = await call(`/moves/${m.bookingId}/review`, { token: cust.token, method: 'POST', body: { rating: 5, comment: 'Careful with my monitor, thanks!' } });
  assert.equal(rev.status, 200);
  assert.equal((await call(`/moves/${m.bookingId}/review`, { token: cust.token, method: 'POST', body: { rating: 1 } })).status, 409, 'one review per move');

  const claim = await call('/support/claims', { token: cust.token, method: 'POST', body: { bookingId: m.bookingId, description: 'Monitor stand scratched', amountClaimed: 500 } });
  assert.equal(claim.status, 201);

  const notes = await call('/notifications', { token: cust.token });
  assert.ok(notes.body.notifications.some((n) => n.bookingId === m.bookingId), 'customer got notifications');
});

test('cancellation refunds follow the policy', async () => {
  const cust = await makeUser();
  const cfg = await call('/payments/config');
  if (!cfg.body.testPayments) return;
  const booked = await call('/moves/book', {
    token: cust.token, method: 'POST',
    body: { origin: 'A', destination: 'B', originLocation: HSR, destinationLocation: WHITEFIELD, date: tomorrow(), timeSlot: 'evening', totalCuFt: 60, contactPhone: '9876500000' }
  });
  const id = booked.body.move.bookingId;
  await call('/payments/test-pay', { token: cust.token, method: 'POST', body: { bookingId: id } });
  const res = await call(`/moves/${id}/cancel`, { token: cust.token, method: 'POST', body: { reason: 'Plans changed' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.move.status, 'cancelled');
  assert.equal(res.body.move.cancellation.refundPercent, 100, '48h ahead → full refund');
  assert.equal(res.body.move.paymentDetails.status, 'refunded');
});

test('a slot that passes without a captain: hidden from captains, free to reschedule or cancel', async () => {
  const cfg = await call('/payments/config');
  if (!cfg.body.testPayments) return;
  const cust = await makeUser();
  const cap = await makeCaptain();
  const booked = await call('/moves/book', {
    token: cust.token, method: 'POST',
    body: { origin: 'HSR Layout, Bengaluru', destination: 'Whitefield, Bengaluru', originLocation: HSR, destinationLocation: WHITEFIELD, date: tomorrow(), timeSlot: 'morning', totalCuFt: 60, contactPhone: '9876500000' }
  });
  const id = booked.body.move.bookingId;
  await call('/payments/test-pay', { token: cust.token, method: 'POST', body: { bookingId: id } });

  // Move the slot into the past, as if nobody had accepted it in time.
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packandgo');
  await mongoose.connection.db.collection('movebookings').updateOne({ bookingId: id }, { $set: { moveDate: new Date(Date.now() - 6 * 3600_000) } });
  await mongoose.disconnect();

  const jobs = await call('/moves/captain/jobs', { token: cap.token });
  assert.ok(!jobs.body.jobs.some((j) => j.bookingId === id), 'stale job not offered');
  assert.equal((await call(`/moves/captain/jobs/${id}/accept`, { token: cap.token, method: 'POST' })).status, 409, 'stale job cannot be accepted');

  const mine = await call('/moves/mine', { token: cust.token });
  assert.equal(mine.body.moves.find((m) => m.bookingId === id).refundPercentIfCancelled, 100, 'full refund when no captain committed');

  const moved = await call(`/moves/${id}/reschedule`, { token: cust.token, method: 'POST', body: { date: tomorrow(), timeSlot: 'afternoon' } });
  assert.equal(moved.status, 200, moved.body.message);
  const back = await call('/moves/captain/jobs', { token: cap.token });
  assert.ok(back.body.jobs.some((j) => j.bookingId === id), 'rescheduled job is offered again');
});

test('family tracking link: owner-only to create, public read-only view, can be turned off', async () => {
  const cfg = await call('/payments/config');
  if (!cfg.body.testPayments) return;
  const cust = await makeUser();
  const stranger = await makeUser();
  const booked = await call('/moves/book', {
    token: cust.token, method: 'POST',
    body: { origin: 'HSR Layout, Bengaluru', destination: 'Whitefield, Bengaluru', originLocation: HSR, destinationLocation: WHITEFIELD, date: tomorrow(), timeSlot: 'evening', totalCuFt: 60, contactPhone: '9876500000' }
  });
  const id = booked.body.move.bookingId;
  assert.equal((await call(`/moves/${id}/share`, { token: cust.token, method: 'POST' })).status, 409, 'not before payment');
  await call('/payments/test-pay', { token: cust.token, method: 'POST', body: { bookingId: id } });

  assert.equal((await call(`/moves/${id}/share`, { token: stranger.token, method: 'POST' })).status, 404, "can't share someone else's move");
  const share = await call(`/moves/${id}/share`, { token: cust.token, method: 'POST' });
  assert.equal(share.status, 200);
  const again = await call(`/moves/${id}/share`, { token: cust.token, method: 'POST' });
  assert.equal(again.body.token, share.body.token, 'same link until turned off');

  const view = await call(`/track/${share.body.token}`); // no sign-in
  assert.equal(view.status, 200);
  const t = view.body.track;
  assert.equal(t.bookingId, id);
  for (const k of ['pickupOtp', 'deliveryOtp', 'userPhone', 'userEmail', 'priceBreakdown', 'paymentDetails', 'trackToken']) assert.ok(!(k in t), `public view hides ${k}`);
  assert.equal((await call('/track/not-a-real-token-123456789')).status, 404);

  assert.equal((await call(`/moves/${id}/share`, { token: cust.token, method: 'DELETE' })).status, 200);
  assert.equal((await call(`/track/${share.body.token}`)).status, 404, 'turned-off link stops working');
  const mine = await call('/moves/mine', { token: cust.token });
  assert.ok(!('trackToken' in mine.body.moves.find((m) => m.bookingId === id)), 'token not leaked in normal views');
});

test('password reset and email verification', async () => {
  const me = await makeUser();
  const fp = await call('/auth/forgot-password', { method: 'POST', body: { email: me.email } });
  assert.equal(fp.status, 200);
  const unknown = await call('/auth/forgot-password', { method: 'POST', body: { email: 'nobody@nowhere.test' } });
  assert.equal(unknown.body.message, fp.body.message, 'same answer for unknown emails');
  if (fp.body.devResetLink) {
    const token = new URL(fp.body.devResetLink).searchParams.get('reset');
    assert.equal((await call('/auth/reset-password', { method: 'POST', body: { token, password: 'newpass12' } })).status, 200);
    assert.equal((await call('/auth/reset-password', { method: 'POST', body: { token, password: 'newpass34' } })).status, 400, 'token is single-use');
    assert.ok((await login(me.email, 'newpass12')).token, 'new password works');
  }
  const bad = await call('/auth/login', { method: 'POST', body: { email: 'nobody@nowhere.test', password: 'whatever1' } });
  const wrongPw = await call('/auth/login', { method: 'POST', body: { email: me.email, password: 'wrongpass' } });
  assert.equal(bad.body.message, wrongPw.body.message, 'login does not reveal which emails exist');

  const su = await makeUser({}, { verify: false });
  const tryBook = await call('/moves/book', { token: su.token, method: 'POST', body: {} });
  assert.equal(tryBook.body.code, 'email_unverified', 'unverified users cannot book');
  if (su.devVerifyLink) {
    const token = new URL(su.devVerifyLink).searchParams.get('verify');
    assert.equal((await call('/auth/verify-email', { method: 'POST', body: { token } })).status, 200);
  }
  const noTerms = await call('/auth/signup', { method: 'POST', body: { name: 'X', email: `no-terms-${Date.now()}@test.local`, password: 'secret12' } });
  assert.equal(noTerms.status, 400, 'terms must be accepted');
});

test('access control', async () => {
  assert.equal((await call('/moves/current')).status, 401);
  assert.equal((await call('/database/seed', { method: 'POST', body: { force: true } })).status, 401);
  const cust = await makeUser();
  assert.equal((await call('/admin/bookings', { token: cust.token })).status, 403);
  assert.equal((await call('/auth/users', { token: cust.token })).status, 403);
  assert.equal((await call('/moves/captain/jobs', { token: cust.token })).status, 403);
});
