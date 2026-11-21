# Pack&Go — QA Report

**Date:** 21 Nov 2026 · **Branch:** `feature/realtime-chat-calls` · **Environment:** local dev (macOS, Node 20.17, MongoDB 7 local, Chromium-based browser pane)

This report records what was **actually executed** and what was **not**. Nothing in the "Verified" sections was inferred from reading code alone.

> **Overall status: not 100% verified.** Core flows, simulated payments, security, real-time features, email delivery (Gmail SMTP), Gemini AI, responsive layout and production configuration are verified. SMS delivery, real-device WebRTC calls across mobile networks, background GPS and iPhone Safari QR scanning **remain unverified** because they need extra services or physical devices (see §10).
>
> **Payments are simulated by design.** Pack&Go is an academic project: there is no payment gateway and no real money moves. Nothing in this report claims otherwise.

---

## 1. Final automated results

| Check | Result | Evidence |
|---|---|---|
| API test suites (`npm test`) | **42 / 42 pass**, 0 fail (≈12 s) | `lifecycle`, `roles`, `payments` (8), `security` (4, new), `email` (mocked transport), `ai` (mocked provider) |
| Dependency audit (`npm audit`) | **0 vulnerabilities** (production and development dependencies) | see §1b |
| Test isolation | A full run leaves **0** records behind (notifications 92 → 92, bookings 8 → 8, users 14 → 14) | before/after counts |
| Lint (`npm run lint`, oxlint) | **0 errors**; 29 React style hints remain (13 set-state-in-effect, 8 only-export-components, 7 purity, 1 static-components) — reviewed, none are bugs | lint output |
| Production build (`npm run build`) | **Builds**; main bundle 454 kB (Vite 8.3.3) (tabs/dialogs load on demand) | Vite output |

### 1b. Dependency security upgrade
| Package | Was | Now | Advisories fixed | Breaking changes that matter here |
|---|---|---|---|---|
| `mongoose` | 9.11.3 | **9.11.4** (patch, pinned `~9.11.4`) | 4 (2 high): connection-level `sanitizeFilter` ignored; inherited-property walk when hydrating/setting/merging; discriminator-key bypass; prototype pollution via `Schema.virtual()` | none (patch release; also bumps its own `mquery` 6.0.0 → 6.0.1) |
| `nodemailer` | 6.10.1 | **10.1.7** (pinned `~10.1.7`) | 22 (5 high, 16 moderate, 1 low), incl. address-parser DoS and mis-delivery, SMTP/header CRLF injection, OAuth2 TLS check, DNS-cache TLS name reuse | Node ≥ 20 (we run 20.17; CI 20; Docker 22) · `NoAuth` → `ENOAUTH` (we only check `EAUTH`, unchanged) · old SES SDK removed (unused) · TLS checks on remote attachments/OAuth2 (unused). Default ESM import, `createTransport`, `verify`, `requireTLS` and timeouts unchanged. |

Verified after upgrading: Gmail SMTP login with nodemailer 10.1.7 (`verify`, no email sent) ✔ · new `security.test.js`: query-operator injection on login/reset/verify/forgot-password and payment IDs refused, `__proto__`/`constructor.prototype` payloads can't grant admin or change email, mongoose hydration ignores prototype keys, the real nodemailer 10 message builder produces the expected multipart email with escaped input and no injected `Bcc` ✔ · server boots, health check 200, Socket.IO handshake 200 ✔.

Development tooling (never shipped to users) — also patched:
| Package | Was | Now | Advisories fixed |
|---|---|---|---|
| `vite` | 8.3.0 | **8.3.3** (exact) | 6 (1 high): `launch-editor` path/argument handling (Windows), files outside `server.fs.allow`, wasm-instance byte leak, cross-origin script via custom middleware |
| `source-map-js` | 1.2.1 | **1.2.2** (`overrides`) | 1 high: event-loop DoS via indexed source-map offsets |
| `rolldown` (Vite's bundler) | 1.2.9 | **1.2.11** (`overrides`) | — the oldest version Vite 8.3.3 accepts, instead of the 10-day-old 1.2.19 npm picked by default |

`npm audit` (all dependencies, dev included): **0 vulnerabilities**.

**Node.js requirement:** Vite 8 and mongoose's `bson` need **Node 20.19+ or 22.12+** (now declared in `package.json` → `engines`). CI (latest Node 20) and Docker (Node 22) meet it. The development Mac runs Node 20.17, where npm drops the Vite/oxlint native binaries on a clean install; they were installed there with `npm install --no-save` (no change to `package.json` or the lockfile). Upgrade local Node to 22 LTS to avoid this.

Also removed: the unused `paymentDetails.razorpayOrderId` field from the booking model (stored values on old bookings are untouched).

All test suites create **throwaway accounts** (`qa-…@test.local`) and delete everything they created in `after()`. No reseed, reset or drop was run during this audit.

---

## 2. Payments (SIMULATED) — Verified

Razorpay was removed (code, webhook, CSP exceptions and the `razorpay`/`stripe` packages). The simulated system is the app's only payment method. It is labelled everywhere: a permanent "Academic Demo — No Real Money Involved." banner, the checkout badge, the Test Payment Information panel, receipts, My Moves and the admin ledger.

### 2a. Automated (`server/tests/payments.test.js` — 8 tests, all pass)
| Case | Result |
|---|---|
| Config says `mode: simulated`, shows the notice, exposes no gateway keys; `/payments/webhook` no longer exists (404) | ✔ |
| **Failed payment** → 402 `payment_failed` with a `DEMO-PAY-…` reference; booking stays `pending_payment` / `unpaid`; customer notified | ✔ |
| **Retry succeeds** → booking `confirmed`, escrow locked, new unique reference, amount taken from the booking (client-sent `amount: 1` ignored) | ✔ |
| Unauthorised: no sign-in 401; another customer 404; a captain 404; bad method/outcome 400; missing or `{ $ne: null }` bookingId 400; stale `expectedAmount` 409 `amount_changed`; status endpoint owner-only | ✔ |
| No other route can mark a booking paid (PATCH with `paymentDetails.status: paid` has no effect) | ✔ |
| **6 simultaneous payments** → exactly one 200, five 409, one ledger row | ✔ |
| **Refunds:** full (48 h ahead) and partial (captain accepted, 10 h ahead → 50 %); double cancel → one 200 + one 409; one refund row per booking, linked to its payment | ✔ |
| **Payout:** none at pickup or with a wrong code; **two simultaneous correct delivery codes** → one 200 + one 409, wallet credited once, one `DEMO-PAYOUT-…` row; payout not shown on the customer's receipt | ✔ (bug fixed — see §9) |
| Admin ledger: customers 403; admin sees payments/failures/refunds with totals, refund status, filters; search text is regex-escaped | ✔ |
| `DEMO_PAYMENTS_ENABLED` defaults to on (also in production); `false` turns it off | ✔ |

### 2b. Browser (throwaway account, removed afterwards)
Checkout at 320–1920 px: no horizontal overflow ✔ · failed payment shows the decline + reference under the Pay button ✔ · successful Demo UPI payment → "Move confirmed", reference shown, "Simulated payment — no real money was charged" ✔ · receipt says "SIMULATED PAYMENT — Academic Demo… Not a valid financial receipt" ✔ · My Moves payment history lists 2 failures, the payment and (after cancelling) the refund ✔ · admin **Ops → Payments** shows every row labelled Simulated ✔.

---

## 3. AI (Google Gemini) — Verified
- With a key: `/api/assistant/status` → `configured: true, provider: gemini`; PackBot chat returns real answers in about 1–3 s (checked again with the replacement key). It follows the rules (e.g. refuses to promise moving vehicles or items it isn't sure about).
- Without a key: chat, `/scan-room` and `/parse-inventory` return 503 `ai_not_configured` and PackBot falls back to keyword answers.
- `ai.test.js` (mocked provider): provider selection, key only in the `Authorization` header, JSON mode, image parts, fence stripping, 429 → rate-limit error, 404/503 → backup models, timeout, error messages never contain the key, output normalised and bounded.
- **Not re-tested this pass:** room-photo scan and voice inventory against the live model (covered by mocked tests only).

## 3b. Email (Gmail SMTP) — Verified
Real delivery confirmed earlier: `npm run email:test` and a signup verification email were accepted by Gmail. `email.test.js` (mocked transport) covers statuses (`sent / not_configured / failed / skipped`), timeouts, masked logging and HTML escaping. Booking confirmation, cancellation/refund and admin-cancel messages now say the payment and refund are simulated.

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
- **Production mode boot (spare port):** serves the built site; **simulated payments stay on** (`/api/payments/config` → `demoPayments: true`, the academic-demo setup); CSP allows no third-party scripts or frames (`script-src 'self'`, `frame-src 'none'`); refuses to start without a strong `JWT_SECRET` (current one is 50 chars); helmet security headers present (CSP, nosniff, HSTS, frame, referrer); force reseed → 403; CORS allows only `CLIENT_URL`.
- Auth rate limiting (20 failed attempts / 15 min), general API limit (1000 / 15 min), 10 MB JSON limit, no payment webhook (404), non-root Docker user with healthcheck, `.env` git-ignored.

---

## 9. Defects found and fixed

### This pass
| # | Defect | Fix |
|---|---|---|
| 0 | Test runs left a "New damage claim" staff notification on the demo admin account each time | Test cleanup now also removes staff alerts that name its own claims/requests. **6 such leftovers from earlier runs were left in place** (no deleting existing records). |
| 1 | **Captain could be paid twice:** two simultaneous correct Delivery OTP submissions both credited the wallet | Delivery is claimed atomically (`in_transit → delivered`); the second request gets 409 |
| 2 | Same trip could be quoted and booked at slightly different prices when the public route server timed out between the two calls | Road distances are cached (6 h; fallback estimates 10 min) |
| 3 | Refund messages promised money "to your original payment method in 5–7 working days" | Messages say the refund is simulated |
| 4 | Receipt close button had no accessible name; Escape didn't close it | `aria-label` added; Escape closes it |
| 5 | Checkout badge overlapped the close button at 320 px | Header wraps and leaves room for the button |

### Earlier passes
Notification panel overflow, dialogs trapped inside glass panels, production CORS allowing localhost, CORS 500s, open database-wipe endpoint, double payment/refund races, new-account draft 500, quote/booking input validation, marketplace contact-detail leak, listing edit/delete, job release.

---

## 10. Remaining unverified — needs credentials or devices

| Area | Needed |
|---|---|
| AI room-photo scan and voice inventory against the live Gemini model | Gemini is configured; not re-run this pass (mocked tests pass) |
| SMS alerts | Twilio (or similar) credentials |
| Calls across mobile networks | A TURN server |
| Background GPS while the phone is locked | A native app |
| Real iOS Safari camera QR scanning | A physical iPhone (BarcodeDetector is unsupported there; manual entry fallback exists) |
