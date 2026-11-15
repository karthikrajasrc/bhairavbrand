import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const uiOrigin = 'http://localhost:5173';
const sessionToken = 'review-admin-session';
const sessionExpiresAt = new Date(Date.now() + 60_000);
const adminUser = {
  _id: 'admin-user',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'admin',
  createdAt: new Date(),
};
const reviews = [];
let server;
let baseUrl;

const query = (operation) => {
  const result = Promise.resolve().then(operation);
  result.populate = () => result;
  return result;
};

const Session = {
  findOne: (filter) => query(() => (
    filter.tokenHash === createHash('sha256').update(sessionToken).digest('hex')
    && sessionExpiresAt > filter.expiresAt.$gt
      ? { _id: 'admin-session', user: adminUser }
      : null
  )),
};

const Review = {
  find: () => {
    const result = Promise.resolve(reviews);
    result.sort = () => Promise.resolve([...reviews].sort((a, b) => b.createdAt - a.createdAt));
    return result;
  },
  create: async (input) => {
    const review = { ...input, _id: String(reviews.length + 1).padStart(24, '0'), createdAt: new Date() };
    reviews.push(review);
    return review;
  },
  findByIdAndDelete: async (id) => {
    const index = reviews.findIndex((review) => review._id === id);
    return index < 0 ? null : reviews.splice(index, 1)[0];
  },
};

before(async () => {
  server = createApp({
    Session,
    Review,
    uiOrigin,
    adminEmail: adminUser.email,
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const request = (path, { method = 'GET', body, authenticated = false } = {}) => fetch(`${baseUrl}${path}`, {
  method,
  headers: {
    Origin: uiOrigin,
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(authenticated ? { Cookie: `bb_session=${sessionToken}` } : {}),
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('reviews can only be managed by admins and are publicly listed', async () => {
  const unauthenticated = await request('/api/admin/reviews', {
    method: 'POST',
    body: { name: 'Customer', stars: 5, comments: 'Excellent quality.' },
  });
  assert.equal(unauthenticated.status, 401);

  const invalid = await request('/api/admin/reviews', {
    method: 'POST',
    authenticated: true,
    body: { name: 'Customer', stars: 6, comments: 'Excellent quality.' },
  });
  assert.equal(invalid.status, 400);

  const created = await request('/api/admin/reviews', {
    method: 'POST',
    authenticated: true,
    body: { name: 'Customer', stars: 4, comments: 'Excellent quality.' },
  });
  assert.equal(created.status, 201);
  const { review } = await created.json();
  assert.equal(review.stars, 4);

  const storefront = await request('/api/storefront/reviews');
  assert.equal(storefront.status, 200);
  assert.deepEqual((await storefront.json()).reviews.map(({ name, stars, comments }) => ({
    name,
    stars,
    comments,
  })), [{ name: 'Customer', stars: 4, comments: 'Excellent quality.' }]);

  const removed = await request(`/api/admin/reviews/${review._id}`, {
    method: 'DELETE',
    authenticated: true,
  });
  assert.equal(removed.status, 204);
  assert.equal((await (await request('/api/storefront/reviews')).json()).reviews.length, 0);
});
