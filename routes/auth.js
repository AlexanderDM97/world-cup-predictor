const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET     = process.env.JWT_SECRET     || 'wc2026-secret-key';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

router.post('/register', async (req, res, next) => {
  try {
    const { name, pin, predicted_champion } = req.body;
    if (!name || !pin)
      return res.status(400).json({ error: 'Name and PIN required' });
    if (!/^\d{4,8}$/.test(String(pin)))
      return res.status(400).json({ error: 'PIN must be 4–8 digits' });
    if (String(name).trim().length < 2)
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    if (!predicted_champion)
      return res.status(400).json({ error: 'Please select your World Cup winner prediction' });

    const hash   = await bcrypt.hash(String(pin), 10);
    const result = await db.execute({
      sql:  'INSERT INTO participants (name, pin_hash, predicted_champion) VALUES (?, ?, ?)',
      args: [String(name).trim(), hash, predicted_champion],
    });
    const id    = Number(result.lastInsertRowid);
    const token = jwt.sign({ id, name: String(name).trim(), role: 'participant' }, JWT_SECRET, { expiresIn: '14d' });
    res.json({ token, name: String(name).trim(), predicted_champion });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'That name is already taken' });
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Name and PIN required' });
    const rs          = await db.execute({ sql: 'SELECT * FROM participants WHERE name = ? COLLATE NOCASE', args: [String(name).trim()] });
    const participant = rs.rows[0];
    if (!participant) return res.status(401).json({ error: 'Invalid name or PIN' });
    const valid = await bcrypt.compare(String(pin), participant.pin_hash);
    if (!valid)   return res.status(401).json({ error: 'Invalid name or PIN' });
    const token = jwt.sign({ id: Number(participant.id), name: participant.name, role: 'participant' }, JWT_SECRET, { expiresIn: '14d' });
    res.json({ token, name: participant.name, predicted_champion: participant.predicted_champion });
  } catch (e) { next(e); }
});

router.post('/admin', (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

module.exports = router;
