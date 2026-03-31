const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const jwtToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!jwtToken) return res.status(401).json({ error: 'Missing token' });

  try {
    const jwtPayload = jwt.verify(jwtToken, getJwtSecret());
    req.user = jwtPayload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, getJwtSecret };

