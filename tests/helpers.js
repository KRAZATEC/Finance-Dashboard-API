// helpers.js — shared test utilities.
// Each test file imports this to get a fresh in-memory DB and pre-seeded users
// without duplicating setup boilerplate.

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const { v4: uuid } = require('uuid');
const app   = require('../src/app');
const { getDb, run } = require('../src/models/db');

// We reset the DB module's singleton between test suites via jest.resetModules()
// but within a suite, all tests share one DB instance — which is fine and fast.

async function setupTestDb() {
  const db = await getDb();

  // Wipe tables in reverse FK order
  db.run(`DELETE FROM records`);
  db.run(`DELETE FROM users`);

  const adminId   = uuid();
  const analystId = uuid();
  const viewerId  = uuid();

  const hash = await bcrypt.hash('password123', 10);

  run(db, `INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)`,
    [adminId,   'Test Admin',   'admin@test.com',   hash, 'admin']);
  run(db, `INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)`,
    [analystId, 'Test Analyst', 'analyst@test.com', hash, 'analyst']);
  run(db, `INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)`,
    [viewerId,  'Test Viewer',  'viewer@test.com',  hash, 'viewer']);

  return { db, adminId, analystId, viewerId };
}

async function loginAs(email) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  return res.body.token;
}

module.exports = { setupTestDb, loginAs };
