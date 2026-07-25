const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../utils/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

function publicUser(u) {
  return { id: u.id, username: u.username, phone: u.phone, isAdmin: u.username === ADMIN_USERNAME };
}

router.post('/signup', async (req, res) => {
  const { username, password, phone } = req.body;
  if (!username || !password || !phone) {
    return res.status(400).json({ error: 'Username, password and phone are all required.' });
  }
  const existing = db.get('users').find(u => u.username.toLowerCase() === username.toLowerCase()).value();
  if (existing) return res.status(409).json({ error: 'That username is already taken.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: uuid(), username, passwordHash, phone, createdAt: Date.now() };
  db.get('users').push(user).write();

  const token = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.username === ADMIN_USERNAME },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ token, user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.get('users').find(u => u.username.toLowerCase() === (username || '').toLowerCase()).value();
  if (!user) return res.status(401).json({ error: 'No account with that username.' });

  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Wrong password.' });

  const token = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.username === ADMIN_USERNAME },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ token, user: publicUser(user) });
});

module.exports = router;
