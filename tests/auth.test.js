const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./helpers');

beforeEach(async () => {
  await setupTestDb();
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns their info', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'new@test.com', password: 'securepass' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@test.com');
    expect(res.body.user.role).toBe('viewer'); // default role
    expect(res.body.user.password).toBeUndefined(); // password must not leak
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dupe', email: 'admin@test.com', password: 'whatever' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 422 when fields are missing or invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123' }); // too short, bad email, no name

    expect(res.status).toBe(422);
    expect(res.body.details).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  it('returns a JWT on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'anything' });

    expect(res.status).toBe(401);
  });
});
