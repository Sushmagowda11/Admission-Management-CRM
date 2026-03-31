const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { getJwtSecret } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const { username, password } = parsed.data;
  const user = await getDb().collection('users').findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) return res.status(401).json({ error: 'Invalid credentials' });

  const jwtToken = jwt.sign(
    { sub: String(user.id), role: user.role, username: user.username },
    getJwtSecret(),
    { expiresIn: '12h' },
  );

  res.json({
    token: jwtToken,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const jwtToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!jwtToken) return res.status(401).json({ error: 'Missing token' });

  try {
    const jwtPayload = jwt.verify(jwtToken, getJwtSecret());
    res.json({ user: { id: jwtPayload.sub, role: jwtPayload.role, username: jwtPayload.username } });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;

