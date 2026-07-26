# Plugged

Kenya's plug for new & thrifted fashion — buy, sell, get it delivered.

This is a full working site: a real backend (accounts, listings, orders, image
uploads) plus the futuristic dark-blue/neon frontend, wired together.

## What's inside

```
plugged/
  backend/          Node.js + Express API
    server.js       entry point — also serves the frontend
    routes/         auth, listings, orders
    middleware/      login-check (JWT) + admin-check
    utils/db.js     the database (see below)
    uploads/        photos sellers upload land here
    .env.example    copy to .env and edit before running
  frontend/
    index.html      the whole site (one file — HTML, CSS, JS)
```

## Running it on your own computer

1. Install [Node.js](https://nodejs.org) (v18 or newer) if you don't have it.
2. Open a terminal in `backend/` and run:
   ```
   npm install
   cp .env.example .env
   ```
3. Open `.env` and change `JWT_SECRET` to any long random string, and set
   `ADMIN_USERNAME` to whichever username you'll personally sign up with —
   that account automatically gets the Admin · Orders tab.
4. Start it:
   ```
   npm start
   ```
5. Visit `http://localhost:4000` in your browser. Sign up with your admin
   username first, then try listing an item and buying it from a second
   account (or an incognito window) to see the full flow.

## How the data is stored

Everything (accounts, listings, orders) is saved in `backend/db.json` — a
plain JSON file, updated instantly on every action. That's genuinely fine for
launch and for a good while after: it's simple, and there's nothing to
configure. When you outgrow it, the only file that needs to change is
`utils/db.js`; swap it for a real Postgres/MySQL connection and every route
keeps working exactly the same, because they only ever talk to the functions
that file exports.

**Back up `db.json` regularly once you're live** — copy it somewhere safe
(email it to yourself, save it to Google Drive) every so often, since it's
the only copy of your whole marketplace.

## Deploying it for real (so anyone can visit it)

The easiest path, since you've already used it for Trade With Hunna:

1. Push this `plugged/` folder to a GitHub repo.
2. On [Render](https://render.com), create a new **Web Service** pointing at
   that repo, with:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
3. In Render's Environment settings, add the same variables from `.env`
   (`JWT_SECRET`, `ADMIN_USERNAME`, `DELIVERY_FEE`, `COMMISSION_RATE`) —
   never commit your real `.env` file to GitHub.
4. One thing to know: Render's free/starter disks reset on redeploy, which
   wipes `db.json` and uploaded photos. For a real launch, add a
   [persistent disk](https://render.com/docs/disks) mounted at
   `/backend` (a couple dollars a month) so your data survives restarts.
5. Once deployed, Render gives you a URL like `plugged.onrender.com` — that's
   your live site. You can point a custom domain at it later.

## Setting up real M-Pesa payments

The site works out of the box with "Cash on delivery" even if you skip this
section — M-Pesa auto-pay is optional, and if it's not configured, buyers who
pick M-Pesa just get told "the admin will contact you to arrange payment"
instead of a PIN prompt. Nothing breaks either way.

To turn on the real "enter your M-Pesa PIN" prompt at checkout:

1. Create an account and an app at
   [developer.safaricom.co.ke](https://developer.safaricom.co.ke).
2. Start on **Sandbox** (fake money, safe to test) — it gives you a Consumer
   Key and Consumer Secret immediately, plus a test shortcode (174379) and
   passkey on the "Lipa Na M-Pesa Sandbox" product page.
3. Fill those into `.env` as `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
   `MPESA_SHORTCODE`, `MPESA_PASSKEY`.
4. Set `MPESA_CALLBACK_URL` to your **public** site URL + `/api/orders/mpesa/callback`
   (e.g. `https://plugged.onrender.com/api/orders/mpesa/callback`). This
   can't be `localhost` — Safaricom's servers need to reach it directly, so
   you'll need the site deployed (or a tool like ngrok) to test this part.
5. Test a real order end to end in Sandbox using Safaricom's test phone
   numbers, then request **Go-Live** on the Daraja portal to get production
   keys and switch `MPESA_ENV=production` with your real Paybill/Till number.

This is already wired up so that once you fill in those variables, checkout
automatically sends the STK push, and the buyer's payment status updates
live in the order modal and their "My Orders" page the moment Safaricom
confirms it — no extra code needed.

## What's still worth adding before a public launch

- **Photo storage on a real host** (e.g. Cloudinary) instead of the server's
  own disk — safer once you're on a persistent disk anyway, and faster to
  load.
- **Password reset** — there's currently no "forgot password" flow.
- **Order notifications** — e.g. an SMS or WhatsApp ping to you (the admin)
  the moment a new order comes in, so you don't have to keep refreshing the
  Admin tab.

## Pricing rules baked in (change anytime in `.env`)

- Every listing price shown to buyers already includes a flat **KES 180**
  delivery fee.
- You (the admin) keep a **10%** commission on the item price of every sale
  — visible only on the Admin · Orders tab, alongside the seller's payout.

## Everything that's built and tested

- Sign up / log in with hashed passwords and real login sessions (JWT)
- Post a listing with a real photo upload, across all 33 categories
- Browse, search, and filter by category and condition (Brand New / Thrifted)
- Buy an item — price shown always includes delivery, commission is
  calculated automatically
- Pay with Cash on Delivery, or M-Pesa STK Push once you've added your Daraja
  keys (falls back gracefully to manual arrangement if you haven't yet)
- Live payment status that updates the moment Safaricom confirms the payment
- My Listings (remove your own items) and My Orders (track status) for
  regular users
- Admin dashboard: every order, buyer contact + delivery address, item price,
  delivery fee, your commission, payment status, delivery status, and a
  "mark delivered" button, with running totals at the top
