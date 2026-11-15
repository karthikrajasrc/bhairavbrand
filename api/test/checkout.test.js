import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const uiOrigin = 'http://localhost:5173';
const productId = '111111111111111111111111';
const variantId = '222222222222222222222222';
const product = {
  _id: productId,
  name: 'Devotional Incense',
  imageUrl: 'https://res.cloudinary.com/example/image/upload/incense.jpg',
  price: 99,
  variants: [{
    _id: variantId,
    amount: 100,
    unit: 'g',
    price: 42.5,
  }],
};
const settings = { deliveryCharge: 35.5, freeShippingThreshold: 500 };
const createdOrders = [];
const razorpayAmounts = [];
let server;
let baseUrl;

const Product = {
  find: async ({ _id }) => (_id.$in.includes(productId) ? [product] : []),
};
const StoreSettings = {
  findOne: async () => settings,
};
const Order = {
  create: async (input) => {
    const order = { ...input, _id: '333333333333333333333333' };
    createdOrders.push(order);
    return order;
  },
};

before(async () => {
  server = createApp({
    Product,
    StoreSettings,
    Order,
    uiOrigin,
    razorpayKeyId: 'test_key',
    razorpayKeySecret: 'test_secret',
    fetchImpl: async (_url, { body }) => {
      const requestBody = JSON.parse(body);
      razorpayAmounts.push(requestBody.amount);
      return {
        ok: true,
        json: async () => ({
          id: `order_${razorpayAmounts.length}`,
          amount: requestBody.amount,
          currency: requestBody.currency,
        }),
      };
    },
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const request = (path, body) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: {
    Origin: uiOrigin,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const cartItem = (quantity = 1) => ({ productId, variantId, quantity });

test('checkout quote uses database product prices and delivery settings', async () => {
  const response = await request('/api/checkout/quote', { items: [cartItem()] });
  assert.equal(response.status, 200);
  const { quote } = await response.json();
  assert.equal(quote.items[0].unitPricePaise, 4250);
  assert.equal(quote.items[0].lineTotalPaise, 4250);
  assert.equal(quote.items[0].name, product.name);
  assert.equal(quote.items[0].variantLabel, '100 g');
  assert.equal(quote.subtotalPaise, 4250);
  assert.equal(quote.deliveryChargePaise, 3550);
  assert.equal(quote.totalPaise, 7800);
});

test('checkout quote applies the database free-delivery threshold', async () => {
  const response = await request('/api/checkout/quote', { items: [cartItem(12)] });
  assert.equal(response.status, 200);
  const { quote } = await response.json();
  assert.equal(quote.subtotalPaise, 51000);
  assert.equal(quote.deliveryChargePaise, 0);
  assert.equal(quote.totalPaise, 51000);
});

test('checkout quote rejects client-supplied prices', async () => {
  const response = await request('/api/checkout/quote', {
    items: [{ ...cartItem(), price: 1 }],
  });
  assert.equal(response.status, 400);
});

test('payment order and stored totals use the same database quote', async () => {
  const response = await request('/api/checkout/orders', {
    customer: {
      name: 'Customer Name',
      email: 'customer@example.com',
      phone: '+91 98765 43210',
      address: {
        line1: '12 Temple Road',
        line2: '',
        city: 'Madurai',
        state: 'Tamil Nadu',
        postalCode: '625001',
      },
    },
    items: [cartItem()],
  });
  assert.equal(response.status, 201);
  const { order } = await response.json();
  assert.equal(razorpayAmounts.at(-1), 7800);
  assert.equal(order.totalPaise, 7800);
  assert.equal(order.items[0].unitPricePaise, 4250);
  assert.equal(createdOrders.at(-1).deliveryChargePaise, 3550);
});
