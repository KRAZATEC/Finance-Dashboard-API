const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, loginAs } = require('./helpers');

let adminToken, analystToken, viewerToken;
let adminId, analystId, viewerId;

beforeEach(async () => {
  const setup = await setupTestDb();
  adminId    = setup.adminId;
  analystId  = setup.analystId;
  viewerId   = setup.viewerId;
  adminToken   = await loginAs('admin@test.com');
  analystToken = await loginAs('analyst@test.com');
  viewerToken  = await loginAs('viewer@test.com');
});

describe('GET /api/users', () => {
  it('admin can list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
    // Password hashes must never appear in the response
    res.body.forEach(u => expect(u.password).toBeUndefined());
  });

  it('analyst cannot list all users (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/users/:id', () => {
  it('user can view their own profile', async () => {
    const res = await request(app)
      .get(`/api/users/${viewerId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('viewer@test.com');
  });

  it('viewer cannot view another user\'s profile (403)', async () => {
    const res = await request(app)
      .get(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
  });

  it('admin can view any user profile', async () => {
    const res = await request(app)
      .get(`/api/users/${viewerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/users/:id/role', () => {
  it('admin can change a user\'s role', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'analyst' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/analyst/);
  });

  it('admin cannot change their own role', async () => {
    const res = await request(app)
      .patch(`/api/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'viewer' });
    expect(res.status).toBe(400);
  });

  it('analyst cannot change roles (403)', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('rejects invalid role value', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superuser' });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/users/:id/status', () => {
  it('admin can deactivate a user', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
  });

  it('inactive user cannot log in', async () => {
    await request(app)
      .patch(`/api/users/${viewerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@test.com', password: 'password123' });
    expect(loginRes.status).toBe(403);
  });
});
