// auth.js — two small middleware functions:
//   1. authenticate  → verifies the JWT and attaches req.user
//   2. requireRole   → rejects requests from users without the right role

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'finance-dashboard-secret-change-in-prod';

// Role hierarchy. Higher index = more permissions.
const ROLE_LEVELS = { viewer: 0, analyst: 1, admin: 2 };

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in first.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role, status }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// requireRole('analyst') means: user must be analyst OR admin (anything >= analyst level)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (req.user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account is inactive. Contact an administrator.' });
    }

    const userLevel = ROLE_LEVELS[req.user.role] ?? -1;
    const minRequired = Math.min(...allowedRoles.map(r => ROLE_LEVELS[r] ?? 99));

    if (userLevel < minRequired) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`
      });
    }

    next();
  };
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

module.exports = { authenticate, requireRole, signToken };
