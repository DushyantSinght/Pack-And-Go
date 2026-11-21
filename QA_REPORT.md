# Pack&Go — QA Report

**Date:** 21 Nov 2026 · **Branch:** `feature/realtime-chat-calls` · **Environment:** local dev (macOS, Node 20.17, MongoDB 7 local, Chromium-based browser pane)

This report records what was **actually executed** and what was **not**. Nothing in the "Verified" sections was inferred from reading code alone.

> **Overall status: not 100% verified.** Core flows, security, real-time features, responsive layout and production configuration are verified. Real Razorpay sandbox payments/refunds, the Claude-powered AI features, email and SMS delivery, and real-device WebRTC calls / background GPS **remain unverified** because the required credentials or devices were not available (see §9).

---

## 1. Final automated results

| Check | Result | Evidence |
|---|---|---|
| API test suites (`npm test`) | **14 / 14 pass**, 0 fail (≈9 s) | `server/tests/lifecycle.test.js`, `server/tests/roles.test.js` |
| Lint (`npm run lint`, oxlint) | **0 errors, 0 unused-code warnings**; 32 React style hints remain (13 set-state-in-effect, 8 only-export-components, 7 purity, 3 exhaustive-deps, 1 static-components) — reviewed, none are bugs | lint output |
| Production build (`npm run build`) | **Builds**; main bundle 440 kB (tabs/dialogs load on demand) | Vite output |

All test suites create **throwaway accounts** (`qa-…@test.local`) and delete everything they created in `after()`. No reseed, reset or drop was run during this audit.

---

## 2. Payments (Razorpay)

### 2a. Verified — built-in development test payments (no gateway)
Covered by `npm test`:
- Pay once → booking `confirmed`, escrow locked; paying again → **409**.
- **Two simultaneous pay requests → exactly one 200, one 409** (atomic `markPaid`).
- **Two simultaneous cancels → exactly one 200, one 409**; refund issued once.
- Refund policy: 100 % ≥ 24 h, 50 % 24–4 h, 0 % < 4 h; **100 % any time before a captain accepts**; full refund when a captain releases the job.
- Driver wallet credited once on delivery OTP; payout = subtotal × (1 − platform fee).

### 2b. Verified — local signature simulation (NOT a Razorpay sandbox test)
An isolated API instance was started on a spare port with **throwaway secrets** (`RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` set to local dummy values). Order IDs were written onto throwaway test bookings to stand in for Razorpay's order step. Results (10/10 PASS):

| Case | Result |
|---|---|
| `/verify` with tampered signature | 400 ✔ |
| `/verify` with another booking's order id | 400 ✔ |
| `/verify` with correct HMAC | 200, booking `confirmed` ✔ |
| `/verify` called twice | idempotent, one payment record ✔ |
| Webhook with bad signature | 400 ✔ |
| Webhook `payment.captured` with wrong amount | ignored, booking stays unpaid ✔ |
| Webhook `payment.failed` | booking stays unpaid, customer notified "Payment failed" ✔ |
| Webhook valid capture, then replayed | confirmed once, replay harmless ✔ |
| Refund of a gateway payment without gateway keys | clean error **and booking is NOT cancelled** (rolled back) ✔ |

### 2c. Unverified
- **Real Razorpay sandbox** (order creation, checkout, real test-card success/failure, real refunds, real webhooks). `server/.env` contains `RAZORPAY_KEY_ID=` and `RAZORPAY_KEY_SECRET=` **with empty values**, and no `RAZORPAY_WEBHOOK_SECRET`. The server correctly reports `razorpay:false`. To verify: add `rzp_test_…` keys + webhook secret and rerun.

---

## 3. AI (Anthropic Claude)

### Verified
- With no key, `/api/assistant/status` → `configured:false`; `/assistant/chat`, `/scan-room`, `/parse-inventory` → **503 `ai_not_configured`** with a clear message; PackBot falls back to its offline keyword answers in the UI.

### Unverified
- **PackBot responses, AI room photo scanning, voice/text inventory parsing, invalid-image handling with a live model.** `ANTHROPIC_API_KEY` is not present in `server/.env`. To verify: add the key and exercise each endpoint.

---

## 4. Real-time (Socket.IO) — Verified (18/18 PASS)
Run against the live API with a throwaway customer, an approved throwaway captain and a stranger:

| Case | Result |
|---|---|
| Customer and captain connect | ✔ |
| Chat message delivered live, socket ack | ✔ |
| Typing indicator relayed | ✔ |
| Captain GPS update accepted; customer receives it live with ETA | ✔ (ETA 6 min) |
| Location persisted (visible after refresh) | ✔ |
| Presence: captain disconnect → customer sees offline | ✔ |
| Reconnect: presence back online; messages flow again | ✔ |
| Message history persisted (survives refresh) | ✔ |
| Stranger cannot post into the conversation | ✔ (`Conversation not found`) |
| Stranger receives no chat or location events | ✔ |
| 6 extra users connect simultaneously | ✔ |
| Expired JWT refused on socket and REST | ✔ |
| Token signed with wrong secret refused | ✔ |
| Non-captain cannot spoof a driver location | ✔ (`not-approved`) |

**Unverified:** WebRTC audio between two real devices on different networks (no TURN server configured — calls across mobile networks are expected to fail); background GPS when the driver's phone screen is off (browser limitation).

---

## 5. Roles — Verified

| Role | API (test suites) | Browser |
|---|---|---|
| Visitor | public pages 200, private 401 | — |
| Customer | signup + email verify, booking, pay, cancel/reschedule, review, claim, passports private, family tracking link | All 7 tabs + My Moves, Booking wizard, Chat drawer, Notifications at 6 widths |
| Driver (approved) | jobs without OTPs, accept, box scan, OTP pickup/delivery, wallet, **release job** | Driver Console at 320 & 1440 |
| Driver (pending) | blocked with `captain_pending` | (earlier pass) |
| Seller | listing (no fake MRP), no self-claim, chat, **edit/delete own listing only, claimed listing → 409** | Edit form at 320 & 1440 |
| Admin | all ops lists 200, customers 403; reseed refused | Ops panel (Captains/Bookings/Claims/Requests) at 320 & 1440 |
| Parent | account works, no captain/admin access | (earlier pass) |

### Seller listing edit / delete (verified in `roles.test.js`)
Others editing or deleting → 404 · seller edit → 200 · negative price → 400 · discount can't be faked after edit · seller deletes own unclaimed listing → 200 · **claimed listing edit/delete → 409**.

### Driver job release (verified in `lifecycle.test.js`)
Another captain releasing → 409 · assigned captain releases → 200 · booking back to `confirmed` · cancel refund becomes 100 % · **customer receives "can't make it" notification** · job no longer listed as the captain's · job can be re-accepted.

---

## 6. Booking lifecycle — Verified (`lifecycle.test.js`, test 1)
Signup → email verified → quote (server-measured distance; client distance ignored; invalid coordinates → 400) → book → pay → hidden from captains until paid → accept → second captain can't steal → release & re-accept → boxes scanned and matched to passports → pickup OTP → can't cancel after pickup → delivery OTP → wallet credited → one review only → damage claim → notifications present.
Also verified: missed-slot handling (stale job hidden, free reschedule/cancel, slot-watcher alert sent once), family tracking link (owner-only, public view hides phone/OTP/price, revocable).

---

## 7. Responsive & UI — Verified
Automated in-browser check (every tab + key dialogs; looks for any element past the viewport edge that isn't inside a scroll container):

| Width | Tabs | My Moves | Booking wizard | Chat drawer | Notifications |
|---|---|---|---|---|---|
| 320 | ✔ | ✔ | ✔ | ✔ | ✔ (fixed this pass) |
| 375 | ✔ | ✔ | ✔ | ✔ | ✔ |
| 768 | ✔ | ✔ | ✔ | ✔ | ✔ (fixed this pass) |
| 1024 | ✔ | ✔ | ✔ | ✔ | ✔ |
| 1440 | ✔ | ✔ | ✔ | ✔ | ✔ |
| 1920 | ✔ | ✔ | ✔ | ✔ | ✔ |

Role dialogs at 320 and 1440: Driver Console ✔, Seller edit form ✔ (fixed this pass), Admin Ops all tabs ✔.

---

## 8. Logs, network, database, production config — Verified
- **Browser:** no failed requests (`performance` entries ≥ 400: none) after the final reload; every page-load endpoint returns non-5xx for customer, driver, seller and admin.
- **Backend log:** no server errors during the final run.
- **Database (read-only check):** 15/16 invariants pass — booked moves are paid, captain fields consistent, delivered moves have payout, refunds ≤ paid, unique booking IDs, no orphan bookings/passports/conversations, claimed listings have a buyer, no fake MRPs, no leftover QA accounts, no tracking links on finished moves.
  - **Open item:** 61 notifications reference users deleted by the accidental reseed earlier in this project's history. They are unreadable by anyone; left in place per the "no destructive operations" rule. Safe to delete later with an admin script.
- **Production mode boot (spare port):** serves the built site; test payments **disabled**; refuses to start without a strong `JWT_SECRET` (current one is 50 chars); helmet security headers present (CSP, nosniff, HSTS, frame, referrer); force reseed → 403; CORS allows only `CLIENT_URL`.
- Auth rate limiting (20 failed attempts / 15 min), general API limit (1000 / 15 min), 10 MB JSON limit, Razorpay webhook mounted with the raw body for HMAC, non-root Docker user with healthcheck, `.env` git-ignored.

---

## 9. Defects found and fixed in this audit

| # | Defect | Fix |
|---|---|---|
| 1 | Notification panel ran off the left edge at ≤ 860 px (navbar wraps, bell moves left) | Pinned under the navbar on phones/tablets |
| 2 | Seller edit/list form and other card-level dialogs were trapped inside blurred glass panels (backdrop not full-screen, top cut off, no scroll lock) | Dialogs render through a top-level portal; dialog roles added |
| 3 | Production CORS still allowed `http://localhost:5173/5174` | Dev ports allowed only in development; `CLIENT_URL` supports a comma-separated list |
| 4 | Disallowed CORS origins produced a 500 and error log lines | Unknown origins quietly get no CORS headers |
| 5 | `/payments/verify` would compute HMACs with an empty secret if keys were missing (not reachable today) | Returns 503 when no secret is configured |

Previously fixed in this QA cycle (still covered by tests): open database-wipe endpoint, double payment/refund races, new-account draft 500, quote/booking input validation, marketplace contact-detail leak, listing edit/delete, job release.

---

## 10. Remaining unverified — needs credentials or devices

| Area | Needed |
|---|---|
| Razorpay sandbox checkout, refunds, webhooks | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (rzp_test_…) and `RAZORPAY_WEBHOOK_SECRET` |
| PackBot, AI room scan, voice/text inventory | `ANTHROPIC_API_KEY` |
| Email verification / reset delivery | SMTP settings (currently logged to the server console only) |
| SMS alerts | Twilio (or similar) credentials |
| Calls across mobile networks | A TURN server |
| Background GPS while the phone is locked | A native app |
| Real iOS Safari camera QR scanning | A physical iPhone (BarcodeDetector is unsupported there; manual entry fallback exists) |
