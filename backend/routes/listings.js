const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('../utils/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = [
  "Trousers", "Shorts", "T-Shirts", "Designer T-Shirts", "Shirts", "Officials", "Jackets", "Hoodies",
  "Tracksuits", "Sweatpants", "Jorts", "Crochet Wear", "Bikinis", "Lingerie", "Underwear", "Gymwear",
  "Armwear", "Belts", "Headwear", "Snapbacks", "Glasses", "Jewelry", "Socks", "Accessories",
  "Bags", "Side Bags", "Sneakers", "Official Shoes", "Heels", "Female Shoes", "Male Shoes", "Unisex Shoes", "Jerseys"
];

// --- image upload setup ---
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, uuid() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed.'));
    cb(null, true);
  }
});

router.get('/categories', (req, res) => res.json(CATEGORIES));

// Browse - public, with optional filters
router.get('/', (req, res) => {
  const { category, condition, search } = req.query;
  let listings = db.get('listings').filter(l => l.status !== 'removed').value();

  if (category && category !== 'All') listings = listings.filter(l => l.category === category);
  if (condition && condition !== 'All') listings = listings.filter(l => l.condition === condition);
  if (search) {
    const q = search.toLowerCase();
    listings = listings.filter(l =>
      `${l.title} ${l.brand} ${l.description} ${l.category} ${l.size}`.toLowerCase().includes(q)
    );
  }
  listings = listings.slice().sort((a, b) => b.createdAt - a.createdAt);
  res.json(listings);
});

router.get('/mine', requireAuth, (req, res) => {
  const mine = db.get('listings')
    .filter(l => l.sellerUsername === req.user.username && l.status !== 'removed')
    .value()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(mine);
});

router.post('/', requireAuth, upload.single('image'), (req, res) => {
  const { category, title, brand, size, condition, description, price } = req.body;
  if (!category || !title || !size || !condition || !description || !price) {
    return res.status(400).json({ error: 'Category, title, size, condition, description and price are required.' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Unknown category.' });
  }
  if (!['Brand New', 'Thrifted'].includes(condition)) {
    return res.status(400).json({ error: 'Condition must be "Brand New" or "Thrifted".' });
  }
  const priceNum = Number(price);
  if (!priceNum || priceNum <= 0) return res.status(400).json({ error: 'Price must be a positive number.' });

  const listing = {
    id: uuid(),
    sellerUsername: req.user.username,
    category,
    title,
    brand: brand || 'Unbranded',
    size,
    condition,
    description,
    price: priceNum,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    status: 'available',
    createdAt: Date.now()
  };
  db.get('listings').push(listing).write();
  res.status(201).json(listing);
});

router.delete('/:id', requireAuth, (req, res) => {
  const listing = db.get('listings').find({ id: req.params.id }).value();
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.sellerUsername !== req.user.username) {
    return res.status(403).json({ error: 'You can only remove your own listings.' });
  }
  db.get('listings').find({ id: req.params.id }).assign({ status: 'removed' }).write();
  res.json({ ok: true });
});

module.exports = router;
