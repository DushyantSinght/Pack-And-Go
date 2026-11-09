// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// End-to-end API test of the booking lifecycle. Run with the API on :5001:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

const B = process.env.API_URL || 'http://localhost:5001/api';
const call = async (path, { token, method = 'GET', body } = {}) => {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const login = async (email) => (await call('/auth/login', { method: 'POST', body: { email, password: 'demo1234' } })).body;
const tomorrow = () => new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);

const HSR = { lat: 12.9116, lng: 77.6474 };
const WHITEFIELD = { lat: 12.9698, lng: 77.75 };

test('full booking lifecycle: quote → book → pay → accept → pickup → deliver → review → claim', async () => {
  const cust = await login('demo@packandgo.in');
  const cap = await login('captain.manju@packandgo.in');
  assert.ok(cust.token && cap.token, 'demo logins work');

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

  const harpreet = await login('captain.harpreet@packandgo.in');
  const steal = await call(`/moves/captain/jobs/${m.bookingId}/accept`, { token: harpreet.token, method: 'POST' });
  assert.equal(steal.status, 409, 'second captain cannot take an accepted job');

  assert.equal((await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.pickupOtp, stage: 'pickup' } })).status, 200);
  const cancelLate = await call(`/moves/${m.bookingId}/cancel`, { token: cust.token, method: 'POST', body: {} });
  assert.equal(cancelLate.status, 409, 'cannot cancel after pickup');

  const before = (await login('captain.manju@packandgo.in')).user.escrowWalletBalance;
  assert.equal((await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.deliveryOtp, stage: 'delivery' } })).status, 200);
  const after = (await login('captain.manju@packandgo.in')).user.escrowWalletBalance;
  assert.ok(after > before, 'captain wallet credited on delivery');

  const rev = await call(`/moves/${m.bookingId}/review`, { token: cust.token, method: 'POST', body: { rating: 5, comment: 'Careful with my monitor, thanks!' } });
  assert.equal(rev.status, 200);
  assert.equal((await call(`/moves/${m.bookingId}/review`, { token: cust.token, method: 'POST', body: { rating: 1 } })).status, 409, 'one review per move');

  const claim = await call('/support/claims', { token: cust.token, method: 'POST', body: { bookingId: m.bookingId, description: 'Monitor stand scratched', amountClaimed: 500 } });
  assert.equal(claim.status, 201);

  const notes = await call('/notifications', { token: cust.token });
  assert.ok(notes.body.notifications.some((n) => n.bookingId === m.bookingId), 'customer got notifications');
});

test('cancellation refunds follow the policy', async () => {
  const cust = await login('demo@packandgo.in');
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

test('password reset and email verification', async () => {
  const fp = await call('/auth/forgot-password', { method: 'POST', body: { email: 'demo@packandgo.in' } });
  assert.equal(fp.status, 200);
  const unknown = await call('/auth/forgot-password', { method: 'POST', body: { email: 'nobody@nowhere.test' } });
  assert.equal(unknown.body.message, fp.body.message, 'same answer for unknown emails');
  if (fp.body.devResetLink) {
    const token = new URL(fp.body.devResetLink).searchParams.get('reset');
    assert.equal((await call('/auth/reset-password', { method: 'POST', body: { token, password: 'demo1234' } })).status, 200);
    assert.equal((await call('/auth/reset-password', { method: 'POST', body: { token, password: 'demo1234' } })).status, 400, 'token is single-use');
  }
  const bad = await call('/auth/login', { method: 'POST', body: { email: 'nobody@nowhere.test', password: 'whatever1' } });
  const wrongPw = await call('/auth/login', { method: 'POST', body: { email: 'demo@packandgo.in', password: 'wrongpass' } });
  assert.equal(bad.body.message, wrongPw.body.message, 'login does not reveal which emails exist');

  const email = `verify${Date.now()}@test.local`;
  const su = await call('/auth/signup', { method: 'POST', body: { name: 'Verify Me', email, password: 'secret12', acceptTerms: true } });
  assert.equal(su.status, 201);
  const tryBook = await call('/moves/book', { token: su.body.token, method: 'POST', body: {} });
  assert.equal(tryBook.body.code, 'email_unverified', 'unverified users cannot book');
  if (su.body.devVerifyLink) {
    const token = new URL(su.body.devVerifyLink).searchParams.get('verify');
    assert.equal((await call('/auth/verify-email', { method: 'POST', body: { token } })).status, 200);
  }
  const noTerms = await call('/auth/signup', { method: 'POST', body: { name: 'X', email: `t${Date.now()}@test.local`, password: 'secret12' } });
  assert.equal(noTerms.status, 400, 'terms must be accepted');
});

test('access control', async () => {
  assert.equal((await call('/moves/current')).status, 401);
  assert.equal((await call('/database/seed', { method: 'POST', body: { force: true } })).status, 401);
  const cust = await login('demo@packandgo.in');
  assert.equal((await call('/admin/bookings', { token: cust.token })).status, 403);
  assert.equal((await call('/auth/users', { token: cust.token })).status, 403);
  assert.equal((await call('/moves/captain/jobs', { token: cust.token })).status, 403);
});
