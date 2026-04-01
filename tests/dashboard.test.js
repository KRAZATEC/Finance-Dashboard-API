const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, loginAs } = require('./helpers');
const { getDb, run } = require('../src/models/db');
const { v4: uuid } = require('uuid');

let adminToken, analystToken, viewerToken, adminId;

beforeEach(async () => {
  const setup = await setupTestDb();
  adminId      = setup.adminId;
  adminToken   = await loginAs('admin@test.com');
  analystToken = await loginAs('analyst@test.com');
  viewerToken  = await loginAs('viewer@test.com');

  // Seed a few records so aggregations actually return data
  const db = await getDb();
  const records = [
    [uuid(), 3000, 'income',  'Salary',      '2024-03-01', adminId],
    [uuid(), 800,  'income',  'Freelance',   '2024-03-15', adminId],
    [uuid(), 1200, 'expense', 'Rent',        '2024-03-01', adminId],
    [uuid(), 250,  'expense', 'Groceries',   '2024-03-10', adminId],
    [uuid(), 100,  'expense', 'Transport',   '2024-03-12', adminId],
  ];
  for (const [id, amount, type, category, date, created_by] of records) {
    run(db, `INSERT INTO records (id,amount,type,category,date,created_by) VALUES (?,?,?,?,?,?)`,
      [id, amount, type, category, date, created_by]);
  }
});

describe('GET /api/dashboard/summary', () => {
  it('viewer can access the summary', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total_income).toBeCloseTo(3800);
    expect(res.body.total_expenses).toBeCloseTo(1550);
    expect(res.body.net_balance).toBeCloseTo(2250);
    expect(res.body.record_count).toBe(5);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dashboard/categories', () => {
  it('analyst can access category breakdown', async () => {
    const res = await request(app)
      .get('/api/dashboard/categories')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(res.body.income).toBeDefined();
    expect(res.body.expense).toBeDefined();
  });

  it('viewer cannot access category breakdown (403)', async () => {
    const res = await request(app)
      .get('/api/dashboard/categories')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/dashboard/trends/monthly', () => {
  it('analyst can get monthly trends', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends/monthly')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Each item should have month, income, expenses, net
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('month');
      expect(res.body[0]).toHaveProperty('income');
      expect(res.body[0]).toHaveProperty('expenses');
      expect(res.body[0]).toHaveProperty('net');
    }
  });

  it('viewer cannot get monthly trends (403)', async () => {
    const res = await request(app)
      .get('/api/dashboard/trends/monthly')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/dashboard/recent', () => {
  it('returns recent records with creator name', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('respects the limit query param', async () => {
    const res = await request(app)
      .get('/api/dashboard/recent?limit=2')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(2);
  });
});
