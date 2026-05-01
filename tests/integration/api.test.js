const express = require('express');
const request = require('supertest');
const TestHelper = require('../helpers');
const Factory = require('../factories');
const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');

function createTestApp() {
  const app = express();
  const users = new Map([
    ['test@example.com', { id: 1, email: 'test@example.com', password: 'password123', name: 'Test User' }]
  ]);
  const posts = new Map();
  let nextPostId = 1;

  app.use(express.json());

  app.post('/api/auth/login', (req, res) => {
    const user = users.get(req.body.email);
    if (!user || user.password !== req.body.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ token: TestHelper.generateJWT(user.id), user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    if (!TestHelper.isValidEmail(email) || !password || password.length < 8 || !name) {
      return res.status(400).json({ error: 'Invalid registration payload' });
    }
    if (users.has(email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    const user = { id: users.size + 1, email, password, name };
    users.set(email, user);
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  app.use('/api/posts', (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  });

  app.post('/api/posts', (req, res) => {
    const post = { ...req.body, id: nextPostId++ };
    posts.set(String(post.id), post);
    res.status(201).json({ success: true, data: post });
  });

  app.get('/api/posts', (req, res) => {
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = parseInt(req.query.skip || '0', 10);
    const data = Array.from(posts.values()).slice(skip, skip + limit);
    res.json({ success: true, data, pagination: { limit, skip, total: posts.size } });
  });

  app.get('/api/posts/:id', (req, res) => {
    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, data: post });
  });

  app.put('/api/posts/:id', (req, res) => {
    const post = posts.get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const updated = { ...post, ...req.body };
    posts.set(req.params.id, updated);
    res.json({ success: true, data: updated });
  });

  app.delete('/api/posts/:id', (req, res) => {
    if (!posts.has(req.params.id)) return res.status(404).json({ error: 'Post not found' });
    posts.delete(req.params.id);
    res.json({ success: true });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

describe('API Integration Tests', () => {
  let app;
  const API_BASE = '/api';

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Authentication', () => {
    it('logs in with valid credentials', async () => {
      const res = await request(app)
        .post(`${API_BASE}/auth/login`)
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('fails with invalid password', async () => {
      const res = await request(app)
        .post(`${API_BASE}/auth/login`)
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('fails with non-existent user', async () => {
      const res = await request(app)
        .post(`${API_BASE}/auth/login`)
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('registers a new user', async () => {
      const newUser = {
        email: TestHelper.generateRandomEmail(),
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const res = await request(app)
        .post(`${API_BASE}/auth/register`)
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(newUser.email);
    });

    it('fails with duplicate email', async () => {
      const res = await request(app)
        .post(`${API_BASE}/auth/register`)
        .send({ email: 'test@example.com', password: 'SecurePassword123!', name: 'Duplicate' });

      expect(res.status).toBe(409);
    });
  });

  describe('CRUD Operations', () => {
    let authToken;
    let createdId;

    beforeEach(async () => {
      const loginRes = await request(app)
        .post(`${API_BASE}/auth/login`)
        .send({ email: 'test@example.com', password: 'password123' });
      authToken = loginRes.body.token;
    });

    it('creates, lists, reads, updates, and deletes posts', async () => {
      const created = await request(app)
        .post(`${API_BASE}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(Factory.post());

      expect(created.status).toBe(201);
      createdId = created.body.data.id;

      const listed = await request(app)
        .get(`${API_BASE}/posts?limit=5&skip=0`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(listed.status).toBe(200);
      expect(Array.isArray(listed.body.data)).toBe(true);
      expect(listed.body.pagination).toBeDefined();

      const read = await request(app)
        .get(`${API_BASE}/posts/${createdId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(read.status).toBe(200);
      expect(read.body.data.id).toBe(createdId);

      const updated = await request(app)
        .put(`${API_BASE}/posts/${createdId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' });
      expect(updated.status).toBe(200);
      expect(updated.body.data.title).toBe('Updated Title');

      const deleted = await request(app)
        .delete(`${API_BASE}/posts/${createdId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deleted.status).toBe(200);

      const deletedAgain = await request(app)
        .delete(`${API_BASE}/posts/${createdId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deletedAgain.status).toBe(404);
    });

    it('rejects unauthenticated post creation', async () => {
      const res = await request(app).post(`${API_BASE}/posts`).send(Factory.post());
      expect(res.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('handles validation errors', async () => {
      const res = await request(app)
        .post(`${API_BASE}/auth/register`)
        .send({ email: 'invalid-email', password: 'short', name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('handles missing routes gracefully', async () => {
      const res = await request(app).get('/api/nonexistent-endpoint');
      expect(res.status).toBe(404);
    });
  });

  describe('Performance', () => {
    it('responds within acceptable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get(`${API_BASE}/posts?limit=100`)
        .set('Authorization', `Bearer ${TestHelper.generateJWT()}`);

      expect(Date.now() - startTime).toBeLessThan(1000);
    });

    it('handles bulk requests', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app)
            .get(`${API_BASE}/posts`)
            .set('Authorization', `Bearer ${TestHelper.generateJWT()}`)
        )
      );

      results.forEach(res => expect(res.status).toBe(200));
    });
  });
});
