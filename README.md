# Pack&Go — home relocation platform

> Designed & built by **DST — Dushyant Singh Tanwar**. © 2026, all rights reserved. See [LICENSE](LICENSE).

> 🎓 **Academic Demo — No Real Money Involved.** Pack&Go is a college capstone project. All payments, refunds and payouts are **simulated**; no payment gateway is used and no card or UPI details are collected.

Customers estimate what they're moving (AI photo scan, voice or by hand), book a time slot, pay (simulated) into escrow, and track their Move Captain live. Approved drivers accept paid jobs, share GPS, scan box QR labels and confirm pickup/delivery with the customer's one-time codes. Staff review drivers, bookings, damage claims and service requests.

**Stack:** React 19 + Vite · Express 5 · MongoDB (Mongoose) · Socket.IO · Google Gemini (or Groq / xAI / Claude) · Nodemailer (SMTP) · Leaflet/OpenStreetMap

---

## Quick start (development)

Requirements: **Node 20.19+ or 22.12+** (22 LTS recommended; older Node 20 releases make npm skip Vite's native bundler), MongoDB running locally.

```bash
npm install
cp server/.env.example server/.env   # then edit JWT_SECRET at least
npm run dev                          # API on :5001, web on :5173
```

Open http://localhost:5173. In development the server seeds demo data and these logins (password **`demo1234`**):

| Role | Email |
|---|---|
| Customer | `demo@packandgo.in` |
| Move Captain (approved) | `captain.manju@packandgo.in`, `captain.harpreet@packandgo.in` |
| Marketplace seller | `ananya.roy@packandgo.in` (and the other sellers) |
| Ops admin | `admin@packandgo.in` |

The sign-in dialog has quick-login buttons for these. To see both sides of a move, open a second (private) window and sign in as the driver there.

### Try the whole flow

1. **Customer:** scan or add items in the estimator, then click **Book this move**. Pick addresses from the suggestions, choose a slot and pay with the **simulated checkout** (Demo card or Demo UPI, and a *Successful* or *Failed* scenario).
2. **Driver** (second window): open the **Driver Console**, **Accept** the job, then **Share live location**. The customer sees the truck on the map in **My Moves** and on the tracking tab.
3. The customer reads the **Pickup OTP** to the driver, who enters it. Then the same with the **Delivery OTP**. The driver's wallet is credited.
4. **Customer:** rate the move, or report damage within 48 hours with photos. **My Moves** shows each booking's payment history and receipt.
5. **Admin:** open **Ops** in the navbar to see drivers, bookings, **simulated payments**, claims and requests.

Chat and calls work between any customer, driver and seller. A call opens the phone dialer (`tel:`), WhatsApp, or an in-app WebRTC voice call when both people are online.

### Tests

With the API running:

```bash
npm test
```

The tests cover the booking lifecycle (quote → book → pay → accept → pickup → deliver → review → claim), simulated payments (success, failure, duplicates, concurrency, unauthorised attempts, refunds, payouts, admin ledger), refund rules, password reset, email delivery, the AI adapter and access control. They create **throwaway accounts** (`qa-…@test.local`) and delete everything those accounts created when they finish; existing data is never touched.

---

## Payments (simulated)

Pack&Go never processes real money. The checkout offers a **Demo card** or **Demo UPI** and a **Successful** or **Failed** test scenario, and shows a *Test Payment Information* panel. Every page shows the notice **"Academic Demo — No Real Money Involved."**

What the server still enforces, exactly as a real payment system would:

- The amount comes from the booking on the server, never from the browser. If the price changed since the customer looked, the payment is refused (`409 amount_changed`).
- Only the booking's owner can pay for it, and only while it is awaiting payment.
- A booking is paid **once**, even with simultaneous requests (atomic update), refunded **once**, and the captain is paid out **once**, only after the correct Delivery OTP.
- Every movement (payment, failed payment, refund, payout) is a row in the `paymenttransactions` ledger with a unique reference such as `DEMO-PAY-7F3A9C21B4E0`, flagged `simulated: true`.
- Cancellation refunds follow the policy: 100 % before a captain accepts or 24 h+ ahead, 50 % from 24 h to 4 h, none after that.

| Endpoint | Who | What |
|---|---|---|
| `GET /api/payments/config` | anyone | `{ mode: 'simulated', demoPayments, notice }` |
| `POST /api/payments/demo` | booking owner | `{ bookingId, method: demo_card\|demo_upi, outcome: success\|failure, expectedAmount }` |
| `GET /api/payments/history` | signed in | your own transactions |
| `GET /api/payments/status/:bookingId` | booking owner | payment state + that booking's transactions (receipt data) |
| `GET /api/admin/transactions?kind=&status=&q=` | admin | the whole ledger with totals |

`DEMO_PAYMENTS_ENABLED` (default `true`, also in production) switches payments on or off. When it's off, new bookings are refused, because they couldn't be paid.

> ⚠️ This implementation is for an academic demonstration only and is **not suitable for commercial financial transactions**. A real business would need a licensed payment gateway, merchant KYC and its compliance requirements, which are outside this project's scope.

---

## Configuration (`server/.env`)

| Variable | Needed for | Without it |
|---|---|---|
| `MONGODB_URI` | everything | defaults to local `packandgo` DB |
| `JWT_SECRET` | logins | dev fallback; **production refuses to start** without a 32+ char secret |
| `CLIENT_URL` | CORS, links in emails | `http://localhost:5173` |
| `DEMO_PAYMENTS_ENABLED` | the simulated checkout | defaults to `true`; `false` switches payments and new bookings off |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (optional `SMTP_SECURE`, `EMAIL_SUPPRESS_DOMAINS`) | verification, password reset, booking emails | nothing is sent and the app says so; in dev the verify/reset links are shown in the UI. Test with `npm run email:test -- you@example.com` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | SMS updates (captain assigned, nearby, delivered…) | SMS printed to the server log |
| `GEMINI_API_KEY` (free, recommended; get one at https://aistudio.google.com/apikey), or `GROQ_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`. Optional `AI_PROVIDER`, `AI_MODEL`, `AI_VISION_MODEL` | PackBot answers, AI room-photo scan, voice/typed inventory | PackBot runs in basic keyword mode; scans ask you to add items by hand. Keys stay on the server and are never logged or sent to the browser |
| `ADMIN_EMAILS` | extra admin accounts (comma-separated) | only DB users with `isAdmin` |
| `GST_RATE` | tax on fares | `0.18` |
| `SEED_DEMO_ACCOUNTS` | demo data in production (**don't**) | demo data only outside production |

Frontend build-time values (in a root `.env` file, or as Docker build args):

| Variable | Used on |
|---|---|
| `VITE_COMPANY_NAME`, `VITE_COMPANY_ADDRESS`, `VITE_SUPPORT_EMAIL`, `VITE_GRIEVANCE_OFFICER` | receipts, legal pages, footer |
| `VITE_MAP_TILE_URL`, `VITE_MAP_ATTRIBUTION` | map tiles. Defaults to OpenStreetMap (fine for light use); set a keyed provider such as MapTiler for production traffic, and add its host to the CSP `img-src` in `server/server.js` |
| `VITE_COMPANY_GSTIN` | turns the payment receipt into a GST **tax invoice**. Leave empty until the business is GST-registered. |

---

## Deploying

One container serves the API, Socket.IO and the built frontend on port 5001:

```bash
docker compose up --build        # app + MongoDB, http://localhost:5001
```

Or on any Node host: `npm ci && npm run build && NODE_ENV=production node server/server.js`. Put it behind HTTPS. Browsers only allow the microphone (calls), camera (box scanning) and GPS (driver tracking) on HTTPS or localhost. The proxy must forward WebSockets for `/socket.io`.

In-app voice calls use public STUN servers, which connect most networks. Some strict corporate and mobile networks need a TURN server added to `ICE_SERVERS` in `src/context/CommsContext.jsx`.

---

## Before going live

These need people or contracts, not code:

- **Legal:** the Terms, Privacy and Refund pages are drafts. Have a lawyer review them, and set the `VITE_COMPANY_*` details and Grievance Officer.
- **Payments:** payments are simulated by design (academic project). Taking real money would need a licensed payment gateway, merchant KYC and a regulated escrow arrangement, none of which are in scope.
- **Driver vetting:** admins currently read licence and vehicle numbers by eye. Add automated checks against government licence and vehicle records (through a KYC provider) and document photo uploads.
- **Messaging providers:** an SMTP sender (SES, Postmark, Sendgrid) with SPF and DKIM set up, and Twilio or MSG91. For bulk SMS in India, register on DLT.
- **Phone numbers:** the seeded demo drivers and sellers use the project owner's own demo number, so *Call on phone* rings that number. Never seed other people's real numbers.
- **Maps:** address search uses the public OpenStreetMap Nominatim server (max about 1 request per second). For real traffic use a paid geocoder or self-host Nominatim.
- **Monitoring:** client and server errors go to the `errorlogs` collection and the server log. Add an alerting service (e.g. Sentry) for production.

---

## Project layout

```
server/
  server.js            Express app, security headers, rate limits, static hosting in production
  socket.js            Socket.IO: chat, typing, presence, call signalling, driver GPS
  routes/              auth, moves (booking lifecycle), payments (simulated), chat, admin, support, assistant (AI), notifications, track, logs
  services/            pricing, payments (simulated ledger), ai (Gemini/Groq/xAI/Claude), notify + emails (in-app / email / SMS), slotWatcher
  models/              Mongoose schemas
  seed/                demo data (development only)
  tests/               node:test API tests
src/
  context/             MoveContext (app + bookings), CommsContext (socket, chat, calls, notifications)
  components/          UI: BookingWizard, MyMovesModal, PaymentModal, DriverConsoleModal, ChatDrawer, CallModal, …
```

---

## License & author

**© 2026 Dushyant Singh Tanwar (DST). All rights reserved.**

This is proprietary software. The source is published for viewing only. Copying, modifying, redistributing or reusing any part of it, including in coursework, portfolios or other products, requires written permission from DST. See [LICENSE](LICENSE).
