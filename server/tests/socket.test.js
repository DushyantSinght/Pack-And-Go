// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Socket.IO (chat + call signalling) uses the same session rules as the API: no token, a forged
// token, a signed-out token or a blocked account can't connect, and blocking closes live sockets.
// Throwaway accounts only; removed at the end. Run with the API on :5001:  npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { call, makeUser, makeAdmin, cleanup } from './_helpers.js';

after(cleanup);
const URL_ = (process.env.API_URL || 'http://localhost:5001/api').replace(/\/api$/, '');

/** Resolves 'connected' or the connect_error message. */
const tryConnect = (token) => new Promise((resolve) => {
  const s = io(URL_, { auth: token === undefined ? {} : { token }, transports: ['websocket'], reconnection: false, timeout: 4000 });
  s.on('connect', () => resolve({ result: 'connected', socket: s }));
  s.on('connect_error', (e) => { s.close(); resolve({ result: e.message }); });
});

test('sockets need a live session', { timeout: 20000 }, async () => {
  assert.equal((await tryConnect(undefined)).result, 'unauthorized', 'no token');
  assert.equal((await tryConnect('not-a-jwt')).result, 'unauthorized', 'forged token');

  const u = await makeUser();
  const ok = await tryConnect(u.token);
  assert.equal(ok.result, 'connected');
  ok.socket.close();

  await call('/auth/logout', { token: u.token, method: 'POST' });
  assert.equal((await tryConnect(u.token)).result, 'unauthorized', 'signed-out token');
});

test('blocking a user closes their live socket and stops reconnects', { timeout: 20000 }, async () => {
  const admin = await makeAdmin();
  const u = await makeUser();
  const live = await tryConnect(u.token);
  assert.equal(live.result, 'connected');
  const closed = new Promise((resolve) => live.socket.on('disconnect', (reason) => resolve(reason)));

  assert.equal((await call(`/admin/users/${u.user._id}/block`, { token: admin.token, method: 'POST', body: { reason: 'QA socket test' } })).status, 200);
  const reason = await Promise.race([closed, new Promise((r) => setTimeout(() => r('still connected'), 4000))]);
  assert.equal(reason, 'io server disconnect', 'server closed the socket');
  live.socket.close();
  assert.equal((await tryConnect(u.token)).result, 'unauthorized', 'cannot reconnect while blocked');
});
