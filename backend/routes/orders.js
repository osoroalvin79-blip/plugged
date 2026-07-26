const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../utils/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const mpesa = require('../utils/mpesa');

const router = express.Router();

const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 180);
const COMMISSION_RATE = Number(process.env.COMMISSION_RATE || 0.10);

router.get('/config', (req, res) => {
  res.json({ deliveryFee: DELIVERY_FEE, commissionRate: COMMISSION_RATE, mpesaConfigured: mpesa.isConfigured() });
});

// Place an order for a listing
router.post('/', requireAuth, async (req, res) => {
  const { listingId, name, phone, address, payment } = req.body;
  if (!listingId || !name || !phone || !address) {
    return res.status(400).json({ error: 'Name, phone, address and listingId are required.' });
  }
  const listing = db.get('listings').find({ id: listingId }).value();
  if (!listing || listing.status !== 'available') {
    return res.status(409).json({ error: 'That item is no longer available.' });
  }

  const commission = Math.round(listing.price * COMMISSION_RATE);
  const total = listing.price + DELIVERY_FEE;
  const wantsMpesa = (payment || '').toLowerCase().includes('mpesa') || (payment || '').toLowerCase().includes('m-pesa');

  const order = {
    id: uuid(),
    listingId: listing.id,
    listingTitle: listing.title,
    listingCategory: listing.category,
    sellerUsername: listing.sellerUsername,
    buyerUsername: req.user.username,
    buyerName: name,
    buyerPhone: phone,
    buyerAddress: address,
    payment: payment || 'Cash on delivery',
    itemPrice: listing.price,
    deliveryFee: DELIVERY_FEE,
    commission,
    sellerPayout: listing.price - commission,
    total,
    status: 'pending',
    paymentStatus: 'not_required',
    mpesaCheckoutRequestId: null,
    mpesaMerchantRequestId: null,
    createdAt: Date.now()
  };

  // Reserve the item first so two people can't buy it at once.
  db.get('listings').find({ id: listingId }).assign({ status: 'sold' }).write();

  if (wantsMpesa && mpesa.isConfigured()) {
    try {
      const stk = await mpesa.stkPush({
        phone,
        amount: total,
        accountReference: 'Plugged',
        transactionDesc: `Order ${listing.title}`.slice(0, 13)
      });
      order.paymentStatus = 'awaiting_payment';
      order.mpesaCheckoutRequestId = stk.CheckoutRequestID || null;
      order.mpesaMerchantRequestId = stk.MerchantRequestID || null;
    } catch (err) {
      // Don't fail the whole order if Safaricom is unreachable/misconfigured -
      // fall back to manual payment and let the admin sort it out.
      order.paymentStatus = 'mpesa_failed';
      order.mpesaError = (err.response && err.response.data && err.response.data.errorMessage) || err.message;
    }
  } else if (wantsMpesa) {
    // Buyer asked for M-Pesa but the site owner hasn't set up Daraja credentials yet.
    order.paymentStatus = 'manual_mpesa';
  }

  db.get('orders').push(order).write();
  res.status(201).json(order);
});

// Buyer/admin polls this while waiting for the STK push result
router.get('/:id/payment-status', requireAuth, (req, res) => {
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.buyerUsername !== req.user.username && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Not your order.' });
  }
  res.json({ status: order.status, paymentStatus: order.paymentStatus });
});

// Safaricom calls this automatically once the buyer enters (or cancels) their PIN.
// No auth here - Safaricom's servers are the caller, not a logged-in user.
router.post('/mpesa/callback', (req, res) => {
  try {
    const stkCallback = req.body.Body && req.body.Body.stkCallback;
    if (!stkCallback) return res.json({ ResultCode: 0, ResultDesc: 'Ignored' });

    const order = db.get('orders').find({ mpesaCheckoutRequestId: stkCallback.CheckoutRequestID }).value();
    if (order) {
      const paid = stkCallback.ResultCode === 0;
      db.get('orders').find({ id: order.id }).assign({
        paymentStatus: paid ? 'paid' : 'failed',
        mpesaResultDesc: stkCallback.ResultDesc
      }).write();
    }
  } catch (e) {
    // Swallow errors - Safaricom just needs a 200 back either way.
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.get('/mine', requireAuth, (req, res) => {
  const mine = db.get('orders')
    .filter(o => o.buyerUsername === req.user.username)
    .value()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(mine);
});

// Admin: view every order
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const all = db.get('orders').value().slice().sort((a, b) => b.createdAt - a.createdAt);
  res.json(all);
});

// Admin: mark an order delivered
router.patch('/:id/deliver', requireAuth, requireAdmin, (req, res) => {
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  db.get('orders').find({ id: req.params.id }).assign({ status: 'delivered' }).write();
  res.json({ ok: true });
});

module.exports = router;
