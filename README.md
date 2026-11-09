# Pack&Go — home relocation platform

> Designed & built by **DST — Dushyant Singh Tanwar**. © 2026, all rights reserved. See [LICENSE](LICENSE).

Customers estimate what they're moving (AI photo scan, voice or by hand), book a time slot, pay into escrow, and track their Move Captain live. Approved drivers accept paid jobs, share GPS, scan box QR labels and confirm pickup/delivery with the customer's one-time codes. Staff review drivers, bookings, damage claims and service requests.

**Stack:** React 19 + Vite · Express 5 · MongoDB (Mongoose) · Socket.IO · Razorpay · Claude (Anthropic) · Leaflet/OpenStreetMap

---

## Quick start (development)

Requirements: Node 20.19+ (or 22.12+), MongoDB running locally.

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

1. **Customer:** scan or add items in the estimator, then click **Book this move**. Pick addresses from the suggestions, choose a slot and pay. Without Razorpay keys, a clearly labelled *test payment* is recorded.
2. **Driver** (second window): open the **Driver Console**, **Accept** the job, then **Share live location**. The customer sees the truck on the map in **My Moves** and on the tracking tab.
3. The customer reads the **Pickup OTP** to the driver, who enters it. Then the same with the **Delivery OTP**. The driver's wallet is credited.
4. **Customer:** rate the move, or report damage within 48 hours with photos.
5. **Admin:** open **Ops** in the navbar to see drivers, bookings, claims and requests.

Chat and calls work between any customer, driver and seller. A call opens the phone dialer (`tel:`), WhatsApp, or an in-app WebRTC voice call when both people are online.

### Tests

With the API running:

```bash
npm test
```

The tests cover the booking lifecycle (quote → book → pay → accept → pickup → deliver → review → claim), refund rules, password reset, email verification and access control. They create bookings for the demo customer in your local database.

---

## Configuration (`server/.env`)

| Variable | Needed for | Without it |
|---|---|---|
| `MONGODB_URI` | everything | defaults to local `packandgo` DB |
| `JWT_SECRET` | logins | dev fallback; **production refuses to start** without a 32+ char secret |
| `CLIENT_URL` | CORS, links in emails | `http://localhost:5173` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | real payments & refunds | dev only: "test payment" button; production: payments unavailable |
| `RAZORPAY_WEBHOOK_SECRET` | catching payments when the browser closes mid-checkout | webhook disabled |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | verification, password reset, booking emails | emails are printed to the server log; in dev the verify/reset links are shown in the UI |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | SMS updates (captain assigned, nearby, delivered…) | SMS printed to the server log |
| `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`) | PackBot answers, AI room-photo scan, voice/typed inventory | PackBot runs in basic keyword mode; scans ask you to add items by hand |
| `ADMIN_EMAILS` | extra admin accounts (comma-separated) | only DB users with `isAdmin` |
| `GST_RATE` | tax on fares | `0.18` |
| `SEED_DEMO_ACCOUNTS` | demo data in production (**don't**) | demo data only outside production |

Frontend build-time values (in a root `.env` file, or as Docker build args):

| Variable | Used on |
|---|---|
| `VITE_COMPANY_NAME`, `VITE_COMPANY_ADDRESS`, `VITE_SUPPORT_EMAIL`, `VITE_GRIEVANCE_OFFICER` | receipts, legal pages, footer |
| `VITE_COMPANY_GSTIN` | turns the payment receipt into a GST **tax invoice**. Leave empty until the business is GST-registered. |

### Razorpay webhook

In the Razorpay Dashboard → Settings → Webhooks, add `https://<your-domain>/api/payments/webhook` with the events `payment.captured`, `order.paid` and `payment.failed`, and copy the secret into `RAZORPAY_WEBHOOK_SECRET`.

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
- **Payments:** a Razorpay account with KYC, live keys and the webhook. The "escrow" is Pack&Go holding funds until delivery, not a regulated escrow account; don't describe it as one.
- **Driver vetting:** admins currently read licence and vehicle numbers by eye. Add automated checks against government licence and vehicle records (through a KYC provider) and document photo uploads.
- **Messaging providers:** an SMTP sender (SES, Postmark, Sendgrid) with SPF and DKIM set up, and Twilio or MSG91. For bulk SMS in India, register on DLT.
- **Phone numbers:** the seeded demo phone numbers may belong to real people. Never press *Call on phone* on demo data.
- **Maps:** address search uses the public OpenStreetMap Nominatim server (max about 1 request per second). For real traffic use a paid geocoder or self-host Nominatim.
- **Monitoring:** client and server errors go to the `errorlogs` collection and the server log. Add an alerting service (e.g. Sentry) for production.

---

## Project layout

```
server/
  server.js            Express app, security headers, rate limits, static hosting in production
  socket.js            Socket.IO: chat, typing, presence, call signalling, driver GPS
  routes/              auth, moves (booking lifecycle), payments, chat, admin, support, assistant (Claude), notifications, logs
  services/            pricing, payments (Razorpay), notify (in-app / email / SMS)
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
