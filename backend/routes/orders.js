const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../utils/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DELIVERY_FEE = Number(process.env.DELIVERY_FEE || 180);
const COMMISSION_RATE = Number(process.env.COMMISSION_RATE || 0.10);

router.get('/config', (req, res) => {
  res.json({ deliveryFee: DELIVERY_FEE, commissionRate: COMMISSION_RATE });
});

// Place an order for a listing
router.post('/', requireAuth, (req, res) => {
  const { listingId, name, phone, address, payment } = req.body;
  if (!listingId || !name || !phone || !address) {
    return res.status(400).json({ error: 'Name, phone, address and listingId are required.' });
  }
  const listing = db.get('listings').find({ id: listingId }).value();
  if (!listing || listing.status !== 'available') {
    return res.status(409).json({ error: 'That item is no longer available.' });
  }

  const commission = Math.round(listing.price * COMMISSION_RATE);
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
    total: listing.price + DELIVERY_FEE,
    status: 'pending',
    createdAt: Date.now()
  };
  db.get('orders').push(order).write();
  db.get('listings').find({ id: listingId }).assign({ status: 'sold' }).write();
  res.status(201).json(order);
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
