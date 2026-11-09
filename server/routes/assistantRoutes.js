// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// PackBot (support chat) and AI room scan, powered by Claude.
// Requires ANTHROPIC_API_KEY (or another Anthropic credential source). Without
// one, endpoints answer 503 and the client falls back to non-AI behaviour —
// nothing is faked.
import express from 'express';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { MoveBooking, User } from '../models/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

let client = null;
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  if (!client) client = new Anthropic();
  return client;
};
export const assistantConfigured = () => !!getClient();

const limiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests — slow down a little.' } });
router.use(limiter);

/** Pull the text out of a response, honouring refusals. */
const textOf = (response) => {
  if (response.stop_reason === 'refusal') return null;
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
};

const notConfigured = (res) =>
  res.status(503).json({ success: false, code: 'ai_not_configured', message: 'AI is not configured on this server. Add ANTHROPIC_API_KEY to server/.env.' });

router.get('/status', (req, res) => res.json({ success: true, configured: assistantConfigured(), model: assistantConfigured() ? MODEL : null }));

// ── PackBot ──────────────────────────────────────────────────────
const SYSTEM = `You are PackBot, the in-app support assistant for Pack&Go, an Indian home-relocation service (pooled trucks, packing, QR "Luggage Passports" for boxes, a P2P resale marketplace, post-move services).

Facts you can rely on:
- Prices are calculated server-side from volume (cu ft), road distance and stairs without a lift; pooled moves share a truck and are cheaper. GST is charged on top.
- Payment is held in escrow and released to the Move Captain only after the customer reads out the Delivery OTP.
- Customers read their Pickup OTP to the captain once boxes are loaded, and the Delivery OTP after checking everything arrived. Never ask the user for their OTPs and tell them never to share them in chat.
- Cancellation: 100% refund 24h+ before the slot, 50% between 4h and 24h, none under 4h or after pickup. Rescheduling is free up to twice, until 4h before the slot.
- Damage claims can be raised from My Moves within 48 hours of delivery, with photos.
- App sections: estimator (AI scan & price), passport (box QR passports), tracking (live truck), marketplace (resale), themes (room setup), postmove (PGs, cooks, storage), campus (student move week). "My Moves" lists bookings.

Style: warm, plain English, 1-4 short sentences. If something needs a human (refund disputes, damage outcomes, safety), tell them to use chat with their Move Captain or raise a claim, and suggest the matching action. Never invent booking details that aren't in the context. If you don't know, say so.`;

const ACTIONS = ['none', 'go_estimator', 'go_passport', 'go_tracking', 'go_marketplace', 'go_themes', 'go_postmove', 'go_campus', 'open_my_moves', 'open_payment', 'open_invoice'];

const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'What PackBot says to the user.' },
    action: { type: 'string', enum: ACTIONS, description: 'Optional UI shortcut to offer alongside the reply.' },
    action_label: { type: 'string', description: 'Short button label for the action, or empty when action is none.' }
  },
  required: ['reply', 'action', 'action_label'],
  additionalProperties: false
};

const bookingContext = async (userId) => {
  if (!userId) return 'The user is not signed in.';
  const me = await User.findById(userId).lean();
  if (!me) return 'The user is not signed in.';
  const moves = await MoveBooking.find({ userEmail: me.email, status: { $ne: 'draft' } }).sort({ createdAt: -1 }).limit(3).lean();
  const lines = [`Signed-in user: ${me.name} (${me.userType}).`];
  if (!moves.length) lines.push('They have no bookings yet.');
  for (const m of moves) {
    lines.push(
      `Booking ${m.bookingId}: status ${m.status}; ${m.origin} → ${m.destination}; ` +
        `${m.moveDate ? new Date(m.moveDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'no date'}` +
        `${m.timeSlot ? ` (${m.timeSlot})` : ''}; total ₹${m.priceBreakdown?.total ?? '?'}; payment ${m.paymentDetails?.status || 'unpaid'}` +
        `${m.assignedCaptainEmail ? '; captain assigned' : ''}${m.cancellation?.at ? `; cancelled (refund ${m.cancellation.refundPercent}%)` : ''}.`
    );
  }
  return lines.join('\n');
};

// POST /api/assistant/chat { messages: [{role:'user'|'assistant', content}] }
router.post('/chat', optionalAuth, async (req, res) => {
  const ai = getClient();
  if (!ai) return notConfigured(res);
  try {
    const history = (Array.isArray(req.body.messages) ? req.body.messages : [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    while (history.length && history[0].role !== 'user') history.shift();
    if (!history.length || history[history.length - 1].role !== 'user') {
      return res.status(400).json({ success: false, message: 'Send a question.' });
    }

    const context = await bookingContext(req.user?._id);
    const response = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: CHAT_SCHEMA } },
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Current account context (live data):\n${context}` }
      ],
      messages: history
    });

    const raw = textOf(response);
    if (raw == null) {
      return res.json({ success: true, reply: "I can't help with that one — please chat with our support team from My Moves.", action: 'none' });
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, action: 'none', action_label: '' };
    }
    res.json({
      success: true,
      reply: String(parsed.reply || '').slice(0, 2000),
      action: ACTIONS.includes(parsed.action) ? parsed.action : 'none',
      actionLabel: String(parsed.action_label || '').slice(0, 40)
    });
  } catch (err) {
    console.error('assistant chat error:', err?.status, err?.message);
    const status = err instanceof Anthropic.RateLimitError ? 429 : 502;
    res.status(status).json({ success: false, message: status === 429 ? 'PackBot is busy — try again in a moment.' : 'PackBot is unavailable right now.' });
  }
});

// ── AI room scan ─────────────────────────────────────────────────
const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    is_room_photo: { type: 'boolean', description: 'False if the image is not a photo of a room or household goods.' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short item name, e.g. "Double bed with mattress".' },
          category: { type: 'string', enum: ['Furniture', 'Appliances', 'Electronics', 'Cartons', 'Decor', 'Other'] },
          quantity: { type: 'integer' },
          cu_ft_each: { type: 'number', description: 'Estimated packed volume of ONE unit in cubic feet.' },
          weight_kg_each: { type: 'number' },
          fragile: { type: 'boolean' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
        },
        required: ['name', 'category', 'quantity', 'cu_ft_each', 'weight_kg_each', 'fragile', 'confidence'],
        additionalProperties: false
      }
    },
    notes: { type: 'string', description: 'Anything the customer should double-check (hidden items, partial view).' }
  },
  required: ['is_room_photo', 'items', 'notes'],
  additionalProperties: false
};

const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024;

// POST /api/assistant/scan-room { image: "data:image/jpeg;base64,..." }
router.post('/scan-room', optionalAuth, async (req, res) => {
  const ai = getClient();
  if (!ai) return notConfigured(res);
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.image || ''));
  if (!m) return res.status(400).json({ success: false, message: 'Upload a JPEG, PNG or WebP photo.' });
  if (m[2].length * 0.75 > MAX_IMAGE_BYTES) return res.status(413).json({ success: false, message: 'Photo is too large (max ~4.5 MB).' });

  try {
    const response = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCAN_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
            {
              type: 'text',
              text:
                'This photo is from a customer planning a home move in India. List every movable household item you can actually see ' +
                '(furniture, appliances, electronics, boxes, bags, decor). Group identical items with a quantity. Estimate packed volume ' +
                'in cubic feet and weight per unit using typical Indian household sizes. Do not include fixtures (built-in wardrobes, ' +
                'ceiling fans, switches, windows). Do not guess items that are not visible.'
            }
          ]
        }
      ]
    });

    const raw = textOf(response);
    if (raw == null) return res.status(422).json({ success: false, message: "That photo couldn't be analysed. Try another one." });
    const parsed = JSON.parse(raw);
    if (!parsed.is_room_photo) return res.status(422).json({ success: false, message: "That doesn't look like a room. Try a wider photo of the room you're moving." });

    const items = parsed.items.slice(0, 60).map((it, i) => ({
      id: Date.now() + i,
      name: it.quantity > 1 ? `${it.quantity}× ${it.name}` : it.name,
      category: it.category,
      cuFt: Math.round(Math.max(0.5, it.cu_ft_each) * Math.max(1, it.quantity) * 10) / 10,
      weightKg: Math.round(Math.max(0.5, it.weight_kg_each) * Math.max(1, it.quantity)),
      fragile: !!it.fragile,
      confidence: it.confidence,
      source: 'ai-scan'
    }));
    res.json({ success: true, items, notes: parsed.notes || '', model: response.model });
  } catch (err) {
    console.error('scan-room error:', err?.status, err?.message);
    res.status(err instanceof Anthropic.RateLimitError ? 429 : 502).json({ success: false, message: 'The AI scan failed. Please try again or add items manually.' });
  }
});

// POST /api/assistant/parse-inventory { text } — turn a spoken/typed room description into items
router.post('/parse-inventory', optionalAuth, async (req, res) => {
  const ai = getClient();
  if (!ai) return notConfigured(res);
  const text = String(req.body.text || '').trim().slice(0, 3000);
  if (text.length < 5) return res.status(400).json({ success: false, message: 'Describe what you are moving.' });
  try {
    const response = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 6000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCAN_SCHEMA } },
      messages: [{
        role: 'user',
        content: `A customer in India described what they are moving. Turn it into an item list with typical packed volumes (cubic feet) and weights. Only include items they mention; set is_room_photo to true.\n\n<description>\n${text}\n</description>`
      }]
    });
    const raw = textOf(response);
    if (raw == null) return res.status(422).json({ success: false, message: "Couldn't understand that description." });
    const parsed = JSON.parse(raw);
    const items = parsed.items.slice(0, 60).map((it, i) => ({
      id: Date.now() + i,
      name: it.quantity > 1 ? `${it.quantity}× ${it.name}` : it.name,
      category: it.category,
      cuFt: Math.round(Math.max(0.5, it.cu_ft_each) * Math.max(1, it.quantity) * 10) / 10,
      weightKg: Math.round(Math.max(0.5, it.weight_kg_each) * Math.max(1, it.quantity)),
      fragile: !!it.fragile,
      source: 'voice'
    }));
    res.json({ success: true, items, notes: parsed.notes || '' });
  } catch (err) {
    console.error('parse-inventory error:', err?.status, err?.message);
    res.status(502).json({ success: false, message: 'Could not process that description. Add items manually.' });
  }
});

export default router;
