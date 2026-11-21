// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// PackBot (support chat), AI room scan and voice/text inventory.
// Runs on Claude, or on a free tier (Google Gemini / Groq) or xAI Grok — see server/services/ai.js.
// Without any AI key, endpoints answer 503 and the client falls back to non-AI behaviour —
// nothing is faked.
import express from 'express';
import rateLimit from 'express-rate-limit';
import { MoveBooking, User } from '../models/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { aiProvider, aiStatus, generateJson, normalizeItems, AiRateLimitError } from '../services/ai.js';

const router = express.Router();
export const assistantConfigured = () => !!aiProvider();

const limiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests — slow down a little.' } });
router.use(limiter);

const notConfigured = (res) =>
  res.status(503).json({ success: false, code: 'ai_not_configured', message: 'AI is not configured on this server. Add GEMINI_API_KEY (free), GROQ_API_KEY, XAI_API_KEY or ANTHROPIC_API_KEY to server/.env.' });

router.get('/status', (req, res) => {
  const st = aiStatus();
  res.json({ success: true, configured: st.configured, provider: st.provider, model: st.model });
});

/** Parse a model's JSON reply; free models occasionally wrap or truncate it. */
const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    const m = /\{[\s\S]*\}/.exec(raw || '');
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
};
const aiErrorStatus = (err) => (err instanceof AiRateLimitError ? 429 : 502);

// ── PackBot ──────────────────────────────────────────────────────
const SYSTEM = `You are PackBot, the in-app support assistant for Pack&Go, an Indian home-relocation service (pooled trucks, packing, QR "Luggage Passports" for boxes, a P2P resale marketplace, post-move services).

Facts you can rely on:
- We do NOT move vehicles (bikes, scooters, cars), cash, jewellery, documents, gas cylinders or hazardous items. Say so clearly if asked; never offer to add them to the estimate.
- If you are not sure whether something is allowed or offered, say you're not sure and suggest contacting support — never guess.
- Prices are calculated server-side from volume (cu ft), road distance and stairs without a lift; pooled moves share a truck and are cheaper. GST is charged on top.
- Payment is held in escrow and released to the Move Captain only after the customer reads out the Delivery OTP.
- Customers read their Pickup OTP to the captain once boxes are loaded, and the Delivery OTP after checking everything arrived. Never ask the user for their OTPs and tell them never to share them in chat.
- Cancellation: free (100% refund) any time before a Move Captain accepts the job. Once accepted: 100% refund 24h+ before the slot, 50% between 4h and 24h, none under 4h or after pickup. Rescheduling is free up to twice, until 4h before the slot (any time while no captain has accepted; if a slot passes with no captain, the customer can reschedule or cancel for a full refund).
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
  if (!assistantConfigured()) return notConfigured(res);
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
    const { raw } = await generateJson({
      system: SYSTEM,
      context: `Current account context (live data):\n${context}`,
      messages: history,
      schema: CHAT_SCHEMA,
      maxTokens: 2000,
      effort: 'low'
    });

    if (raw == null) {
      return res.json({ success: true, reply: "I can't help with that one — please chat with our support team from My Moves.", action: 'none' });
    }
    const parsed = parseJson(raw) || { reply: raw, action: 'none', action_label: '' };
    res.json({
      success: true,
      reply: String(parsed.reply || '').slice(0, 2000),
      action: ACTIONS.includes(parsed.action) ? parsed.action : 'none',
      actionLabel: String(parsed.action_label || '').slice(0, 40)
    });
  } catch (err) {
    console.error('assistant chat error:', err?.status || err?.name, String(err?.message || '').slice(0, 120));
    const status = aiErrorStatus(err);
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
  if (!assistantConfigured()) return notConfigured(res);
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.image || ''));
  if (!m) return res.status(400).json({ success: false, message: 'Upload a JPEG, PNG or WebP photo.' });
  if (m[2].length * 0.75 > MAX_IMAGE_BYTES) return res.status(413).json({ success: false, message: 'Photo is too large (max ~4.5 MB).' });

  try {
    const { raw, model } = await generateJson({
      messages: [{
        role: 'user',
        content:
                'This photo is from a customer planning a home move in India. List every movable household item you can actually see ' +
                '(furniture, appliances, electronics, boxes, bags, decor). Group identical items with a quantity. Estimate packed volume ' +
                'in cubic feet and weight per unit using typical Indian household sizes. Do not include fixtures (built-in wardrobes, ' +
                'ceiling fans, switches, windows). Do not guess items that are not visible.'
      }],
      image: { mediaType: m[1], base64: m[2] },
      schema: SCAN_SCHEMA,
      maxTokens: 8000,
      effort: 'medium'
    });

    const parsed = raw == null ? null : parseJson(raw);
    if (!parsed) return res.status(422).json({ success: false, message: "That photo couldn't be analysed. Try another one." });
    if (parsed.is_room_photo === false) return res.status(422).json({ success: false, message: "That doesn't look like a room. Try a wider photo of the room you're moving." });
    const items = normalizeItems(parsed, 'ai-scan');
    if (!items.length) return res.status(422).json({ success: false, message: "No movable items were found in that photo. Try a wider shot, or add items manually." });
    res.json({ success: true, items, notes: String(parsed.notes || '').slice(0, 500), model });
  } catch (err) {
    console.error('scan-room error:', err?.status || err?.name, String(err?.message || '').slice(0, 120));
    res.status(aiErrorStatus(err)).json({ success: false, message: 'The AI scan failed. Please try again or add items manually.' });
  }
});

// POST /api/assistant/parse-inventory { text } — turn a spoken/typed room description into items
router.post('/parse-inventory', optionalAuth, async (req, res) => {
  if (!assistantConfigured()) return notConfigured(res);
  const text = String(req.body.text || '').trim().slice(0, 3000);
  if (text.length < 5) return res.status(400).json({ success: false, message: 'Describe what you are moving.' });
  try {
    const { raw } = await generateJson({
      messages: [{
        role: 'user',
        content: `A customer in India described what they are moving. Turn it into an item list with typical packed volumes (cubic feet) and weights. Only include items they mention; set is_room_photo to true.\n\n<description>\n${text}\n</description>`
      }],
      schema: SCAN_SCHEMA,
      maxTokens: 6000,
      effort: 'low'
    });
    const parsed = raw == null ? null : parseJson(raw);
    if (!parsed) return res.status(422).json({ success: false, message: "Couldn't understand that description." });
    const items = normalizeItems(parsed, 'voice');
    if (!items.length) return res.status(422).json({ success: false, message: "Couldn't find any items in that description. Try naming them, e.g. \"a double bed, two chairs\"." });
    res.json({ success: true, items, notes: String(parsed.notes || '').slice(0, 500) });
  } catch (err) {
    console.error('parse-inventory error:', err?.status || err?.name, String(err?.message || '').slice(0, 120));
    res.status(aiErrorStatus(err)).json({ success: false, message: 'Could not process that description. Add items manually.' });
  }
});

export default router;
