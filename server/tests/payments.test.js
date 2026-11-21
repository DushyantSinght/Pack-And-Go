// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// SIMULATED payment system (academic demo — no real money). Run with the API on :5001:  npm test
// Throwaway accounts only; everything they create is removed when the suite ends.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { call, login, makeUser, makeCaptain, cleanup } from './_helpers.js';
import { PLATFORM_FEE_RATE } from '../services/pricing.js';

after(cleanup);
const inDays = (d) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
const HSR = { lat: 12.9116, lng: 77.6474 };
const WHITEFIELD = { lat: 12.9698, lng: 77.75 };
const TXN = /^DEMO-(PAY|RFND|PAYOUT)-[0-9A-F]{12}$/;

const book = async (cust, slot = 'morning') => {
  const r = await call('/moves/book', {
    token: cust.token, method: 'POST',
    body: { origin: 'HSR Layout, Bengaluru', destination: 'Whitefield, Bengaluru', originLocation: HSR, destinationLocation: WHITEFIELD, date: inDays(2), timeSlot: slot, totalCuFt: 80, contactPhone: '9876500000' }
  });
  assert.equal(r.status, 201, r.body.message);
  return r.body.move;
};
const pay = (cust, bookingId, body = {}) => call('/payments/demo', { token: cust.token, method: 'POST', body: { bookingId, ...body } });
const history = async (cust) => (await call('/payments/history', { token: cust.token })).body.transactions;
const db = async () => {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packandgo');
  return mongoose.connection.db;
};
after(() => mongoose.disconnect());

test('config advertises simulated payments with the academic notice', async () => {
  const cfg = (await call('/payments/config')).body;
  assert.equal(cfg.mode, 'simulated');
  assert.equal(cfg.demoPayments, true);
  assert.equal(cfg.notice, 'Academic Demo — No Real Money Involved.');
  assert.deepEqual(cfg.methods, ['demo_card', 'demo_upi']);
  for (const k of ['razorpay', 'key', 'testPayments']) assert.ok(!(k in cfg), `no gateway config (${k})`);
  assert.equal((await call('/payments/webhook', { method: 'POST', body: {} })).status, 404, 'no gateway webhook');
});

test('failed payment leaves the booking unpaid; a retry succeeds with a unique reference', async () => {
  const cust = await makeUser();
  const m = await book(cust);
  const fail = await pay(cust, m.bookingId, { outcome: 'failure', method: 'demo_upi' });
  assert.equal(fail.status, 402);
  assert.equal(fail.body.code, 'payment_failed');
  assert.match(fail.body.txnId, TXN);
  const still = (await call(`/payments/status/${m.bookingId}`, { token: cust.token })).body;
  assert.equal(still.status, 'pending_payment');
  assert.equal(still.paymentDetails.status, 'unpaid');

  const ok = await pay(cust, m.bookingId, { method: 'demo_card', expectedAmount: m.priceBreakdown.total, amount: 1, status: 'paid' });
  assert.equal(ok.status, 200, ok.body.message);
  assert.equal(ok.body.simulated, true);
  assert.match(ok.body.txnId, TXN);
  assert.notEqual(ok.body.txnId, fail.body.txnId);
  const b = ok.body.booking;
  assert.equal(b.status, 'confirmed');
  assert.equal(b.escrowStatus, 'escrow_locked');
  assert.equal(b.paymentDetails.amountPaid, m.priceBreakdown.total, 'amount comes from the booking, not the client');
  assert.equal(b.paymentDetails.transactionId, ok.body.txnId);
  assert.equal(b.paymentDetails.testMode, true, 'flagged as simulated');

  const h = await history(cust);
  assert.deepEqual(h.map((t) => [t.kind, t.status]).sort(), [['payment', 'failed'], ['payment', 'success']]);
  assert.ok(h.every((t) => t.simulated === true && t.bookingId === m.bookingId));
  const s = (await call(`/payments/status/${m.bookingId}`, { token: cust.token })).body;
  assert.equal(s.transactions.length, 2, 'receipt data lists both attempts');
  await new Promise((r) => setTimeout(r, 300));
  const notes = (await call('/notifications', { token: cust.token })).body.notifications;
  assert.ok(notes.some((n) => n.bookingId === m.bookingId && /failed/i.test(n.title)), 'customer told about the failure');
  assert.ok(notes.some((n) => n.bookingId === m.bookingId && /confirmed/i.test(n.title)), 'customer told about the confirmation');
});

test('unauthorised and invalid payment attempts are refused', async () => {
  const cust = await makeUser();
  const other = await makeUser();
  const cap = await makeCaptain();
  const m = await book(cust);
  assert.equal((await call('/payments/demo', { method: 'POST', body: { bookingId: m.bookingId } })).status, 401, 'must sign in');
  assert.equal((await pay(other, m.bookingId)).status, 404, "can't pay someone else's booking");
  assert.equal((await pay(cap, m.bookingId)).status, 404, 'captains cannot pay customers’ bookings');
  assert.equal((await pay(cust, m.bookingId, { method: 'real_card' })).status, 400);
  assert.equal((await pay(cust, m.bookingId, { outcome: 'paid' })).status, 400);
  assert.equal((await pay(cust, undefined)).status, 400);
  assert.equal((await pay(cust, { $ne: null })).status, 400, 'no operator injection in bookingId');
  const stale = await pay(cust, m.bookingId, { expectedAmount: m.priceBreakdown.total + 500 });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'amount_changed');
  assert.equal((await call(`/payments/status/${m.bookingId}`, { token: other.token })).status, 404, 'status is owner-only');
  // No other route can flip a booking to paid.
  await call(`/moves/${m.bookingId}`, { token: cust.token, method: 'PATCH', body: { paymentDetails: { status: 'paid' }, status: 'confirmed' } });
  const after1 = (await call(`/payments/status/${m.bookingId}`, { token: cust.token })).body;
  assert.equal(after1.paymentDetails.status, 'unpaid');
  assert.equal(after1.status, 'pending_payment');
  assert.equal((await history(cust)).length, 0, 'nothing recorded for refused attempts');
});

test('concurrent payments: exactly one succeeds and one ledger row is written', async () => {
  const cust = await makeUser();
  const m = await book(cust, 'evening');
  const res = await Promise.all(Array.from({ length: 6 }, () => pay(cust, m.bookingId)));
  assert.deepEqual(res.map((r) => r.status).sort(), [200, 409, 409, 409, 409, 409]);
  const ok = (await history(cust)).filter((t) => t.kind === 'payment' && t.status === 'success');
  assert.equal(ok.length, 1);
  assert.equal((await pay(cust, m.bookingId)).status, 409, 'paying again later is refused');
});

test('cancellation refunds: full and partial, each recorded once and linked to the payment', async () => {
  const cust = await makeUser();
  const cap = await makeCaptain();

  // Full refund (48 h ahead) — double cancel refunds once.
  const a = await book(cust);
  const paidA = (await pay(cust, a.bookingId)).body;
  const cancels = await Promise.all([1, 2].map(() => call(`/moves/${a.bookingId}/cancel`, { token: cust.token, method: 'POST', body: { reason: 'Plans changed' } })));
  assert.deepEqual(cancels.map((c) => c.status).sort(), [200, 409]);
  const ca = cancels.find((c) => c.status === 200).body.move;
  assert.equal(ca.paymentDetails.status, 'refunded');
  assert.equal(ca.paymentDetails.refundAmount, a.priceBreakdown.total);
  assert.equal(ca.escrowStatus, 'refunded');

  // Partial refund: captain accepted and the slot is 10 h away → 50 %.
  const b = await book(cust, 'evening');
  await pay(cust, b.bookingId);
  assert.equal((await call(`/moves/captain/jobs/${b.bookingId}/accept`, { token: cap.token, method: 'POST' })).status, 200);
  await (await db()).collection('movebookings').updateOne({ bookingId: b.bookingId }, { $set: { moveDate: new Date(Date.now() + 10 * 3600_000) } });
  const cb = (await call(`/moves/${b.bookingId}/cancel`, { token: cust.token, method: 'POST', body: { reason: 'Late change' } })).body.move;
  assert.equal(cb.cancellation.refundPercent, 50);
  assert.equal(cb.paymentDetails.status, 'partially_refunded');
  assert.equal(cb.paymentDetails.refundAmount, Math.round(b.priceBreakdown.total / 2));

  const refunds = (await history(cust)).filter((t) => t.kind === 'refund');
  assert.equal(refunds.length, 2, 'one refund row per cancelled booking');
  const ra = refunds.find((t) => t.bookingId === a.bookingId);
  assert.match(ra.txnId, /^DEMO-RFND-/);
  assert.equal(ra.relatedTxnId, paidA.txnId, 'refund points at the payment it reverses');
  assert.equal(ca.paymentDetails.refundId, ra.txnId);
  assert.equal((await call(`/moves/${a.bookingId}/cancel`, { token: cust.token, method: 'POST', body: {} })).status, 409, 'cancelled booking cannot be refunded again');
});

test('captain payout is recorded once, only after the delivery OTP — even with simultaneous submissions', async () => {
  const cust = await makeUser();
  const cap = await makeCaptain();
  const m = await book(cust);
  await pay(cust, m.bookingId);
  await call(`/moves/captain/jobs/${m.bookingId}/accept`, { token: cap.token, method: 'POST' });
  const wallet = async () => (await call('/auth/me', { token: cap.token })).body.user.escrowWalletBalance || 0;
  const payouts = async () => (await history(cap)).filter((t) => t.kind === 'payout');

  assert.equal((await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.deliveryOtp, stage: 'delivery' } })).status, 409, 'no delivery before pickup');
  assert.equal((await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.pickupOtp, stage: 'pickup' } })).status, 200);
  assert.equal((await payouts()).length, 0, 'nothing paid out at pickup');
  assert.equal((await call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: '000000', stage: 'delivery' } })).status, 400, 'wrong code pays nothing');
  assert.equal((await payouts()).length, 0);

  const before = await wallet();
  const both = await Promise.all([1, 2].map(() => call('/moves/verify-otp', { token: cap.token, method: 'POST', body: { bookingId: m.bookingId, otp: m.deliveryOtp, stage: 'delivery' } })));
  assert.deepEqual(both.map((r) => r.status).sort(), [200, 409], 'delivered exactly once');
  const expected = Math.round(m.priceBreakdown.subtotal * (1 - PLATFORM_FEE_RATE));
  assert.equal((await wallet()) - before, expected, 'wallet credited exactly once');
  const p = await payouts();
  assert.equal(p.length, 1);
  assert.equal(p[0].amount, expected);
  assert.match(p[0].txnId, /^DEMO-PAYOUT-/);
  const s = (await call(`/payments/status/${m.bookingId}`, { token: cust.token })).body;
  assert.equal(s.escrowStatus, 'released_to_captain');
  assert.ok(!s.transactions.some((t) => t.kind === 'payout'), "customer's receipt doesn't list the captain's payout");
});

test('admin can inspect the simulated ledger; others cannot', async () => {
  const cust = await makeUser();
  const m = await book(cust);
  await pay(cust, m.bookingId, { outcome: 'failure' });
  const ok = (await pay(cust, m.bookingId)).body;
  await call(`/moves/${m.bookingId}/cancel`, { token: cust.token, method: 'POST', body: { reason: 'Test' } });

  assert.equal((await call('/admin/transactions', { token: cust.token })).status, 403);
  const admin = await login('admin@packandgo.in');
  const r = await call(`/admin/transactions?q=${m.bookingId}`, { token: admin.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.simulated, true);
  assert.match(r.body.notice, /No Real Money/);
  const rows = r.body.transactions;
  assert.deepEqual(rows.map((t) => `${t.kind}:${t.status}`).sort(), ['payment:failed', 'payment:success', 'refund:success']);
  assert.ok(rows.every((t) => t.simulated && t.bookingId === m.bookingId && TXN.test(t.txnId) && t.amount > 0));
  assert.equal(rows.find((t) => t.txnId === ok.txnId).refundedAmount, m.priceBreakdown.total, 'refund status shown on the payment');
  const onlyRefunds = await call(`/admin/transactions?kind=refund&q=${m.bookingId}`, { token: admin.token });
  assert.deepEqual(onlyRefunds.body.transactions.map((t) => t.kind), ['refund']);
  assert.equal((await call('/admin/transactions?q=(((', { token: admin.token })).status, 200, 'search text is escaped');
});

test('DEMO_PAYMENTS_ENABLED switches payments (and therefore bookings) off; it defaults to on', async () => {
  const { demoPaymentsEnabled } = await import('../services/payments.js');
  const saved = process.env.DEMO_PAYMENTS_ENABLED;
  try {
    delete process.env.DEMO_PAYMENTS_ENABLED;
    assert.equal(demoPaymentsEnabled(), true, 'on by default — also in production');
    process.env.DEMO_PAYMENTS_ENABLED = 'false';
    assert.equal(demoPaymentsEnabled(), false);
    process.env.DEMO_PAYMENTS_ENABLED = 'true';
    assert.equal(demoPaymentsEnabled(), true);
  } finally {
    if (saved === undefined) delete process.env.DEMO_PAYMENTS_ENABLED; else process.env.DEMO_PAYMENTS_ENABLED = saved;
  }
});
