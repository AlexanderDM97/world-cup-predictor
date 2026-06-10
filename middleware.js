const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'wc2026-secret-key';

function authenticateParticipant(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const p = jwt.verify(auth.slice(7), JWT_SECRET);
    if (p.role !== 'participant') return res.status(403).json({ error: 'Forbidden' });
    req.participant = p;
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

function authenticateAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Admin authentication required' });
  try {
    const p = jwt.verify(auth.slice(7), JWT_SECRET);
    if (p.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

function optionalParticipant(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const p = jwt.verify(auth.slice(7), JWT_SECRET);
      if (p.role === 'participant') req.participant = p;
    } catch {}
  }
  next();
}

module.exports = { authenticateParticipant, authenticateAdmin, optionalParticipant };
