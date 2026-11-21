// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// One small interface over several AI providers, so PackBot / room scan / voice inventory can run
// on a free tier. Pick with AI_PROVIDER, or let it auto-detect from whichever key is set:
//
//   anthropic  ANTHROPIC_API_KEY   Claude (paid)            — the original integration, unchanged
//   gemini     GEMINI_API_KEY      Google Gemini (free tier, understands photos)  ← recommended free
//   groq       GROQ_API_KEY        Groq-hosted Llama (free tier, fast)
//   xai        XAI_API_KEY         xAI Grok (paid)
//
// Optional: AI_MODEL (text) and AI_VISION_MODEL (photos) override each provider's default model.
// Keys are only ever sent to the provider's own API, and never logged.
import Anthropic from '@anthropic-ai/sdk';

const OPENAI_COMPATIBLE = {
  // Free tier: the 'lite' models answer in ~1-2 s and are rarely overloaded, while full Flash often
  // returns 503 'high demand'. Google also retires ids for new keys (2.5-flash already is), so there
  // are backups. Override with AI_MODEL / AI_VISION_MODEL.
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: 'GEMINI_API_KEY', model: 'gemini-3.5-flash-lite', vision: 'gemini-3.5-flash-lite', fallbacks: ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'], label: 'Google Gemini' },
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile', vision: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Groq' },
  xai: { url: 'https://api.x.ai/v1/chat/completions', key: 'XAI_API_KEY', model: 'grok-3-mini', vision: 'grok-2-vision-1212', label: 'xAI Grok' }
};
const ANTHROPIC_MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const TIMEOUT_MS = () => Number(process.env.AI_TIMEOUT_MS) || 45_000; // whole request, including backups
const ATTEMPT_MS = 20_000; // one model's turn — a stuck model mustn't starve the backups

export class AiRateLimitError extends Error {}

/** Which provider is active (or null). Explicit AI_PROVIDER wins; otherwise the first key found. */
export const aiProvider = () => {
  const want = String(process.env.AI_PROVIDER || '').toLowerCase().trim();
  const hasAnthropic = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (want) {
    if (want === 'anthropic') return hasAnthropic ? 'anthropic' : null;
    return OPENAI_COMPATIBLE[want] && process.env[OPENAI_COMPATIBLE[want].key] ? want : null;
  }
  if (hasAnthropic) return 'anthropic';
  return Object.keys(OPENAI_COMPATIBLE).find((p) => process.env[OPENAI_COMPATIBLE[p].key]) || null;
};

export const aiModel = (vision = false) => {
  const p = aiProvider();
  if (!p) return null;
  if (p === 'anthropic') return ANTHROPIC_MODEL();
  const cfg = OPENAI_COMPATIBLE[p];
  return vision ? process.env.AI_VISION_MODEL || process.env.AI_MODEL || cfg.vision : process.env.AI_MODEL || cfg.model;
};

export const aiStatus = () => {
  const p = aiProvider();
  return { configured: !!p, provider: p, providerLabel: p === 'anthropic' ? 'Anthropic Claude' : OPENAI_COMPATIBLE[p]?.label || null, model: aiModel() };
};

let anthropic = null;

/**
 * Ask the active model for JSON.
 * @param {{ system?: string, context?: string, messages: {role:'user'|'assistant', content:string}[], image?: {mediaType:string, base64:string},
 *           schema: object, maxTokens?: number, effort?: 'low'|'medium' }} req
 * @returns {Promise<{ raw: string|null, model: string }>}  raw null = the model declined.
 */
export const generateJson = async ({ system, context, messages, image, schema, maxTokens = 2000, effort = 'low' }) => {
  const provider = aiProvider();
  if (!provider) throw new Error('AI not configured');

  if (provider === 'anthropic') {
    if (!anthropic) anthropic = new Anthropic();
    const msgs = messages.map((m, i) => (image && i === messages.length - 1
      ? { role: m.role, content: [{ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } }, { type: 'text', text: m.content }] }
      : m));
    try {
      const response = await anthropic.beta.messages.create({
        model: ANTHROPIC_MODEL(),
        max_tokens: maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort, format: { type: 'json_schema', schema } },
        // Static instructions are cached; per-user context comes after so it doesn't break the cache.
        ...(system && { system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }, ...(context ? [{ type: 'text', text: context }] : [])] }),
        messages: msgs
      });
      if (response.stop_reason === 'refusal') return { raw: null, model: response.model };
      return { raw: response.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), model: response.model };
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) throw new AiRateLimitError('rate limited');
      throw err;
    }
  }

  // OpenAI-compatible providers (Gemini, Groq, xAI). They don't all enforce a schema, so the schema
  // goes in the instructions and JSON mode keeps the reply parseable; callers validate the result.
  const cfg = OPENAI_COMPATIBLE[provider];
  const model = aiModel(!!image);
  const instructions = `${system ? `${system}\n\n` : ''}${context ? `${context}\n\n` : ''}Reply with ONE JSON object only (no markdown, no prose) that matches this JSON Schema:\n${JSON.stringify(schema)}`;
  const chat = messages.map((m, i) => (image && i === messages.length - 1
    ? { role: m.role, content: [{ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } }, { type: 'text', text: m.content }] }
    : m));
  // Try the chosen model, then the provider's backups when a model is overloaded (503) or retired (404).
  const pinned = !!(process.env.AI_MODEL || (image && process.env.AI_VISION_MODEL));
  const candidates = [model, ...(pinned ? [] : cfg.fallbacks || [])].filter((m, i, all) => all.indexOf(m) === i);
  const deadline = Date.now() + TIMEOUT_MS();
  let res;
  let usedModel = model;
  for (const m of candidates) {
    usedModel = m;
    res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env[cfg.key]}` },
      body: JSON.stringify({ model: m, max_tokens: maxTokens, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: instructions }, ...chat] }),
      signal: AbortSignal.timeout(Math.max(1000, Math.min(ATTEMPT_MS, deadline - Date.now())))
    }).catch((err) => {
      if (err.name !== 'TimeoutError' || m === candidates[candidates.length - 1] || Date.now() >= deadline) throw err;
      return { status: 503, ok: false }; // treat a slow model like an overloaded one and move on
    });
    if (![404, 503].includes(res.status) || Date.now() >= deadline) break;
    console.warn(`${cfg.label}: model ${m} unavailable (HTTP ${res.status})${m !== candidates[candidates.length - 1] ? ', trying backup' : ''}`);
  }
  if (res.status === 429 || res.status === 503) throw new AiRateLimitError('busy');
  if (!res.ok) {
    // Status only — provider error bodies can echo request details.
    throw Object.assign(new Error(`${cfg.label} HTTP ${res.status}`), { status: res.status });
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice || choice.finish_reason === 'content_filter') return { raw: null, model: data.model || usedModel };
  let raw = String(choice.message?.content || '').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim(); // some models wrap JSON in fences
  return { raw, model: data.model || usedModel };
};

const CATEGORIES = ['Furniture', 'Appliances', 'Electronics', 'Cartons', 'Decor', 'Other'];

/** Coerce a model's item list into safe, bounded values (free models don't always follow the schema). */
export const normalizeItems = (parsed, source) => {
  const list = Array.isArray(parsed?.items) ? parsed.items : [];
  return list.slice(0, 60).filter((it) => it && String(it.name || '').trim()).map((it, i) => {
    const qty = Math.min(50, Math.max(1, Math.round(Number(it.quantity) || 1)));
    const cu = Math.min(200, Math.max(0.5, Number(it.cu_ft_each) || 2));
    const kg = Math.min(500, Math.max(0.5, Number(it.weight_kg_each) || 5));
    const name = String(it.name).trim().slice(0, 80);
    return {
      id: Date.now() + i,
      name: qty > 1 ? `${qty}× ${name}` : name,
      category: CATEGORIES.includes(it.category) ? it.category : 'Other',
      cuFt: Math.round(cu * qty * 10) / 10,
      weightKg: Math.round(kg * qty),
      fragile: it.fragile === true || it.fragile === 'true',
      ...(it.confidence && { confidence: ['high', 'medium', 'low'].includes(it.confidence) ? it.confidence : 'low' }),
      source
    };
  });
};
