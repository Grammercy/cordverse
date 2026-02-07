const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.ENCRYPTION_KEY || 'default-insecure-secret-please-change';

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
};

module.exports = { requireAuth, JWT_SECRET };
