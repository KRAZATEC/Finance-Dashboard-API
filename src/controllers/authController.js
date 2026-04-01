// authController.js — handles registration and login.
// On login, returns a signed JWT which the client should include as a Bearer token.

const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { getDb, query, run } = require('../models/db');
const { signToken } = require('../middleware/auth');

async function register(req, res) {
  const db = await getDb();
  const { name, email, password, role = 'viewer' } = req.body;

  const existing = query(db, `SELECT id FROM users WHERE email = ?`, [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const id = uuid();

  run(db, `
    INSERT INTO users (id, name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `, [id, name, email, hashed, role]);

  return res.status(201).json({
    message: 'Account created successfully.',
    user: { id, name, email, role, status: 'active' }
  });
}

async function login(req, res) {
  const db = await getDb();
  const { email, password } = req.body;

  const users = query(db, `SELECT * FROM users WHERE email = ?`, [email]);
  const user = users[0];

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'Your account has been deactivated.' });
  }

  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role, status: user.status });

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}

module.exports = { register, login };
