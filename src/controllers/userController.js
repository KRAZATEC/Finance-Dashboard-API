// userController.js — admin-level user management.
// Regular users can view their own profile. Only admins can list all users or change roles/status.

const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { getDb, query, run } = require('../models/db');

// Strip the password hash before sending user data to the client
function sanitize(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

async function listUsers(req, res) {
  const db = await getDb();
  const users = query(db, `SELECT * FROM users ORDER BY created_at DESC`);
  return res.json(users.map(sanitize));
}

async function getUser(req, res) {
  const db = await getDb();
  const { id } = req.params;

  // Non-admins can only look at their own profile
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'You can only view your own profile.' });
  }

  const users = query(db, `SELECT * FROM users WHERE id = ?`, [id]);
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json(sanitize(users[0]));
}

async function createUser(req, res) {
  const db = await getDb();
  const { name, email, password, role = 'viewer' } = req.body;

  const existing = query(db, `SELECT id FROM users WHERE email = ?`, [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'A user with that email already exists.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const id = uuid();

  run(db, `
    INSERT INTO users (id, name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `, [id, name, email, hashed, role]);

  const [created] = query(db, `SELECT * FROM users WHERE id = ?`, [id]);
  return res.status(201).json(sanitize(created));
}

async function updateRole(req, res) {
  const db = await getDb();
  const { id } = req.params;
  const { role } = req.body;

  // Prevent an admin from accidentally demoting themselves
  if (req.user.id === id) {
    return res.status(400).json({ error: "You can't change your own role." });
  }

  const users = query(db, `SELECT id FROM users WHERE id = ?`, [id]);
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  run(db, `UPDATE users SET role = ? WHERE id = ?`, [role, id]);
  return res.json({ message: `Role updated to '${role}'.` });
}

async function updateStatus(req, res) {
  const db = await getDb();
  const { id } = req.params;
  const { status } = req.body;

  if (req.user.id === id) {
    return res.status(400).json({ error: "You can't change your own status." });
  }

  const users = query(db, `SELECT id FROM users WHERE id = ?`, [id]);
  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found.' });
  }

  run(db, `UPDATE users SET status = ? WHERE id = ?`, [status, id]);
  return res.json({ message: `User status updated to '${status}'.` });
}

module.exports = { listUsers, getUser, createUser, updateRole, updateStatus };
