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

## What's still worth adding before a public launch

- **Real M-Pesa payment** — right now "M-Pesa" is just a label the buyer
  picks; no money actually moves automatically. Adding Safaricom's Daraja
  API STK Push would charge the buyer at checkout instead of you chasing
  payment manually. Happy to build that next when you're ready.
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
