// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// AI provider adapter (Gemini / Groq / xAI / Claude). fetch is MOCKED — no real AI call, no key needed.
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { aiProvider, aiModel, aiStatus, generateJson, normalizeItems, AiRateLimitError } from '../services/ai.js';

const KEYS = ['AI_PROVIDER', 'AI_MODEL', 'AI_VISION_MODEL', 'AI_TIMEOUT_MS', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'XAI_API_KEY', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const realFetch = globalThis.fetch;
let calls = [];
const mockFetch = (reply) => {
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    return typeof reply === 'function' ? reply(url, opts) : reply;
  };
};
const okReply = (content, extra = {}) => new Response(JSON.stringify({ model: 'mock-model', choices: [{ message: { content }, finish_reason: 'stop', ...extra }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const SCHEMA = { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] };

beforeEach(() => { KEYS.forEach((k) => delete process.env[k]); calls = []; globalThis.fetch = realFetch; });
after(() => { globalThis.fetch = realFetch; KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))); });

test('provider selection: none, auto-detect, explicit, and Claude first', () => {
  assert.equal(aiProvider(), null);
  assert.equal(aiStatus().configured, false);
  process.env.GROQ_API_KEY = 'g';
  assert.equal(aiProvider(), 'groq');
  process.env.GEMINI_API_KEY = 'x';
  assert.equal(aiProvider(), 'gemini', 'gemini preferred over groq when both are set');
  process.env.AI_PROVIDER = 'groq';
  assert.equal(aiProvider(), 'groq', 'explicit choice wins');
  process.env.AI_PROVIDER = 'xai';
  assert.equal(aiProvider(), null, 'explicit provider without its key = not configured (no silent switch)');
  delete process.env.AI_PROVIDER;
  process.env.ANTHROPIC_API_KEY = 'a';
  assert.equal(aiProvider(), 'anthropic', 'existing Claude setups keep working');
});

test('Gemini: OpenAI-compatible request with JSON mode, schema in instructions, key in header only', async () => {
  process.env.GEMINI_API_KEY = 'secret-gemini-key';
  mockFetch(okReply('{"reply":"Hello!"}'));
  const out = await generateJson({ system: 'You are PackBot.', context: 'User has 1 booking.', messages: [{ role: 'user', content: 'hi' }], schema: SCHEMA });
  assert.equal(out.raw, '{"reply":"Hello!"}');
  const c = calls[0];
  assert.match(c.url, /generativelanguage\.googleapis\.com\/v1beta\/openai\/chat\/completions$/);
  assert.equal(c.opts.headers.Authorization, 'Bearer secret-gemini-key');
  assert.equal(c.body.model, 'gemini-3.5-flash-lite');
  assert.deepEqual(c.body.response_format, { type: 'json_object' });
  assert.equal(c.body.messages[0].role, 'system');
  assert.ok(c.body.messages[0].content.includes('You are PackBot.') && c.body.messages[0].content.includes('User has 1 booking.') && c.body.messages[0].content.includes('"reply"'));
  assert.ok(!c.opts.body.includes('secret-gemini-key'), 'key never in the request body');
});

test('photos go as an image part and use the vision model; AI_MODEL overrides', async () => {
  process.env.GROQ_API_KEY = 'k';
  mockFetch(okReply('```json\n{"is_room_photo":true,"items":[],"notes":""}\n```'));
  const out = await generateJson({ messages: [{ role: 'user', content: 'List items' }], image: { mediaType: 'image/jpeg', base64: 'AAAA' }, schema: SCHEMA });
  assert.equal(out.raw, '{"is_room_photo":true,"items":[],"notes":""}', 'markdown fences stripped');
  const user = calls[0].body.messages[1];
  assert.equal(user.content[0].type, 'image_url');
  assert.equal(user.content[0].image_url.url, 'data:image/jpeg;base64,AAAA');
  assert.equal(calls[0].body.model, 'meta-llama/llama-4-scout-17b-16e-instruct');
  process.env.AI_MODEL = 'my-model';
  assert.equal(aiModel(), 'my-model');
  assert.equal(aiModel(true), 'my-model', 'AI_MODEL also used for photos unless AI_VISION_MODEL is set');
});

test('errors: 429 → rate-limit error; other failures carry status only; content filter → declined', async () => {
  process.env.XAI_API_KEY = 'xai-secret';
  mockFetch(new Response('slow down', { status: 429 }));
  await assert.rejects(generateJson({ messages: [{ role: 'user', content: 'x' }], schema: SCHEMA }), AiRateLimitError);
  mockFetch(new Response('{"error":"bad key xai-secret"}', { status: 401 }));
  await assert.rejects(generateJson({ messages: [{ role: 'user', content: 'x' }], schema: SCHEMA }), (e) => e.status === 401 && !e.message.includes('xai-secret'));
  mockFetch(okReply('', { finish_reason: 'content_filter' }));
  assert.equal((await generateJson({ messages: [{ role: 'user', content: 'x' }], schema: SCHEMA })).raw, null);
});

test('Gemini: a retired (404) or overloaded (503) model falls back to a backup model', async () => {
  process.env.GEMINI_API_KEY = 'k';
  const seen = [];
  mockFetch((url, opts) => {
    const { model } = JSON.parse(opts.body);
    seen.push(model);
    if (model === 'gemini-3.5-flash-lite' || model === 'pinned-model') return new Response('{"error":{"code":404}}', { status: 404 });
    if (model === 'gemini-flash-lite-latest') return new Response('{"error":{"code":503}}', { status: 503 });
    return okReply('{"reply":"from backup"}');
  });
  const out = await generateJson({ messages: [{ role: 'user', content: 'x' }], schema: SCHEMA });
  assert.deepEqual(seen, ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite']);
  assert.equal(out.raw, '{"reply":"from backup"}');
  process.env.AI_MODEL = 'pinned-model';
  seen.length = 0;
  await assert.rejects(generateJson({ messages: [{ role: 'user', content: 'x' }], schema: SCHEMA }));
  assert.deepEqual(seen, ['pinned-model'], 'a model you pin yourself is never swapped');
});

test('a hanging provider times out', async () => {
  process.env.GEMINI_API_KEY = 'k';
  process.env.AI_TIMEOUT_MS = '150';
  globalThis.fetch = (url, opts) => new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(opts.signal.reason)));
  // AbortSignal.timeout doesn't keep a bare test process alive (a server always is), so hold it open.
  const keepAlive = setInterval(() => {}, 50);
  const t0 = Date.now();
  try {
    await assert.rejects(generateJson({ messages: [{ role: 'user', content: 'x' }], schema: SCHEMA }));
    assert.ok(Date.now() - t0 < 2000);
  } finally {
    clearInterval(keepAlive);
  }
});

test('normalizeItems keeps free-model output safe and bounded', () => {
  const items = normalizeItems({
    items: [
      { name: 'Double bed', category: 'Furniture', quantity: 1, cu_ft_each: 60, weight_kg_each: 70, fragile: false, confidence: 'high' },
      { name: 'Chairs', category: 'Seating', quantity: '3', cu_ft_each: 'lots', weight_kg_each: -4, fragile: 'true' },
      { name: '', quantity: 2 },
      { name: 'Huge thing', quantity: 999, cu_ft_each: 99999 }
    ]
  }, 'voice');
  assert.equal(items.length, 3, 'unnamed items dropped');
  assert.equal(items[0].name, 'Double bed');
  assert.equal(items[1].name, '3× Chairs');
  assert.equal(items[1].category, 'Other', 'unknown category coerced');
  assert.equal(items[1].weightKg, 2, 'negative weight clamped (0.5 kg each × 3, rounded)');
  assert.equal(items[1].fragile, true);
  assert.ok(items[2].cuFt <= 200 * 50, 'volume bounded');
  assert.deepEqual(normalizeItems(null, 'x'), [], 'garbage → empty list');
});
