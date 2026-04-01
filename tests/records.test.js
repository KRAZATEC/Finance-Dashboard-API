const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, loginAs } = require('./helpers');
const { getDb, run } = require('../src/models/db');
const { v4: uuid } = require('uuid');

let adminToken, analystToken, viewerToken, adminId;

beforeEach(async () => {
  const setup = await setupTestDb();
  adminId = setup.adminId;
  adminToken   = await loginAs('admin@test.com');
  analystToken = await loginAs('analyst@test.com');
  viewerToken  = await loginAs('viewer@test.com');
});

async function createSampleRecord(token) {
  return request(app)
    .post('/api/records')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 1500, type: 'income', category: 'Salary', date: '2024-03-01', notes: 'March salary' });
}

describe('POST /api/records', () => {
  it('admin can create a record', async () => {
    const res = await createSampleRecord(adminToken);
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1500);
    expect(res.body.type).toBe('income');
  });

  it('analyst cannot create a record (403)', async () => {
    const res = await createSampleRecord(analystToken);
    expect(res.status).toBe(403);
  });

  it('viewer cannot create a record (403)', async () => {
    const res = await createSampleRecord(viewerToken);
    expect(res.status).toBe(403);
  });

  it('rejects negative amount', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: -50, type: 'income', category: 'Other', date: '2024-01-01' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid type', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100, type: 'profit', category: 'Other', date: '2024-01-01' });
    expect(res.status).toBe(422);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100 }); // missing type, category, date
    expect(res.status).toBe(422);
  });
});

describe('GET /api/records', () => {
  beforeEach(async () => {
    await createSampleRecord(adminToken);
  });

  it('viewer can list records', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns pagination metadata', async () => {
    const res = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: 20
    });
  });

  it('filters by type', async () => {
    const res = await request(app)
      .get('/api/records?type=income')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('income'));
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/records?from=2024-01-01&to=2024-12-31')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/records/:id', () => {
  let recordId;

  beforeEach(async () => {
    const created = await createSampleRecord(adminToken);
    recordId = created.body.id;
  });

  it('admin can update a record', async () => {
    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 2000, notes: 'Updated note' });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(2000);
  });

  it('viewer cannot update a record (403)', async () => {
    const res = await request(app)
      .patch(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 9999 });
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent record', async () => {
    const res = await request(app)
      .patch(`/api/records/${uuid()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/records/:id', () => {
  let recordId;

  beforeEach(async () => {
    const created = await createSampleRecord(adminToken);
    recordId = created.body.id;
  });

  it('admin can soft-delete a record', async () => {
    const del = await request(app)
      .delete(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    // Deleted record should no longer appear in list
    const list = await request(app)
      .get('/api/records')
      .set('Authorization', `Bearer ${viewerToken}`);
    const ids = list.body.data.map(r => r.id);
    expect(ids).not.toContain(recordId);
  });

  it('viewer cannot delete a record (403)', async () => {
    const res = await request(app)
      .delete(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });
});
