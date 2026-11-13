import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { User, Session } from '../src/models/index.js';

const uiOrigin = 'http://localhost:5173';
const users = [];
const sessions = [];
let server;
let baseUrl;
let nextUserId = 1;
let nextSessionId = 1;

function query(operation) {
  const result = Promise.resolve().then(operation);
  result.select = () => result;
  result.populate = () => result;
  return result;
}

function duplicateKeyError() {
  const error = new Error('Duplicate key');
  error.code = 11000;
  return error;
}

const matches = (document, filter) => Object.entries(filter).every(([key, value]) => {
  if (value && typeof value === 'object' && '$exists' in value) {
    return value.$exists ? key in document : !(key in document);
  }
  if (value && typeof value === 'object' && '$gt' in value) {
    return document[key] > value.$gt;
  }
  return document[key] === value;
});

const FakeUser = {
  create: async (input) => {
    if (users.some((user) => user.email === input.email)) throw duplicateKeyError();
    if (input.googleSub && users.some((user) => user.googleSub === input.googleSub)) throw duplicateKeyError();
    const user = { ...input, _id: String(nextUserId++), createdAt: new Date() };
    users.push(user);
    return user;
  },
  findOne: (filter) => query(() => users.find((user) => matches(user, filter)) || null),
  findOneAndUpdate: async (filter, update) => {
    const user = users.find((candidate) => matches(candidate, filter));
    if (!user) return null;
    Object.assign(user, update.$set);
    return user;
  },
};

const FakeSession = {
  create: async (input) => {
    const session = { ...input, _id: String(nextSessionId++) };
    sessions.push(session);
    return session;
  },
  findOne: (filter) => query(() => {
    const session = sessions.find((candidate) => matches(candidate, filter));
    if (!session) return null;
    const user = users.find((candidate) => candidate._id === session.user);
    return user ? { ...session, user } : null;
  }),
  deleteOne: async (filter) => {
    const index = sessions.findIndex((session) => matches(session, filter));
    if (index >= 0) sessions.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  },
};

before(async () => {
  server = createApp({ User: FakeUser, Session: FakeSession, uiOrigin }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('Mongo models enforce unique identity and TTL session indexes', async () => {
  const userIndexes = User.schema.indexes();
  const sessionIndexes = Session.schema.indexes();
  assert.ok(userIndexes.some(([fields, options]) => fields.email === 1 && options.unique));
  assert.ok(userIndexes.some(([fields, options]) => fields.googleSub === 1 && options.unique && options.sparse));
  assert.ok(sessionIndexes.some(([fields, options]) => fields.expiresAt === 1 && options.expireAfterSeconds === 0));
});

test('registration, session lifecycle, validation and origin checks', async () => {
  const post = (path, body, origin = uiOrigin, cookie) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const invalidOrigin = await post('/api/auth/register', {
    name: 'Basket User',
    email: 'user@example.com',
    password: 'a-secure-password',
  }, 'https://unexpected.example');
  assert.equal(invalidOrigin.status, 403);

  const invalidInput = await post('/api/auth/register', {
    name: 'B',
    email: 'not-an-email',
    password: 'short',
  });
  assert.equal(invalidInput.status, 400);
  const oversizedPassword = await post('/api/auth/register', {
    name: 'Basket User',
    email: 'unicode@example.com',
    password: '🍎'.repeat(20),
  });
  assert.equal(oversizedPassword.status, 400);

  const signup = await post('/api/auth/register', {
    name: 'Basket User',
    email: 'USER@example.com',
    password: 'a-secure-password',
  });
  assert.equal(signup.status, 201);
  const signupData = await signup.json();
  assert.equal(signupData.user.email, 'user@example.com');
  const cookie = signup.headers.get('set-cookie')?.split(';')[0];
  assert.match(signup.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(signup.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.ok(cookie?.startsWith('bb_session='));

  const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.name, 'Basket User');

  const duplicate = await post('/api/auth/register', {
    name: 'Another User',
    email: 'user@example.com',
    password: 'another-secure-password',
  });
  assert.equal(duplicate.status, 409);

  const badLogin = await post('/api/auth/login', {
    email: 'user@example.com',
    password: 'incorrect-password',
  });
  assert.equal(badLogin.status, 401);
  const unknownLogin = await post('/api/auth/login', {
    email: 'missing@example.com',
    password: 'incorrect-password',
  });
  assert.equal(unknownLogin.status, 401);

  const login = await post('/api/auth/login', {
    email: 'user@example.com',
    password: 'a-secure-password',
  });
  assert.equal(login.status, 200);
  const loginCookie = login.headers.get('set-cookie')?.split(';')[0];
  const logout = await post('/api/auth/logout', {}, uiOrigin, loginCookie);
  assert.equal(logout.status, 204);
  const loggedOut = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: loginCookie } });
  assert.equal(loggedOut.status, 401);

  const noGoogle = await post('/api/auth/google', { credential: 'a-valid-looking-credential-value' });
  assert.equal(noGoogle.status, 503);
});

test('production auth cookies support separately hosted HTTPS origins', async () => {
  const productionServer = createApp({
    User: FakeUser,
    Session: FakeSession,
    uiOrigin: 'https://shop.example.com',
    nodeEnv: 'production',
  }).listen(0);
  await new Promise((resolve) => productionServer.once('listening', resolve));

  try {
    const response = await fetch(`http://127.0.0.1:${productionServer.address().port}/api/auth/register`, {
      method: 'POST',
      headers: { Origin: 'https://shop.example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hosted User',
        email: 'hosted@example.com',
        password: 'a-secure-hosted-password',
      }),
    });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=None/i);
    assert.match(cookie, /HttpOnly/i);
  } finally {
    await new Promise((resolve, reject) => productionServer.close((error) => error ? reject(error) : resolve()));
  }
});
