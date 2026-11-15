import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const uiOrigin = 'http://localhost:5173';
const inquiries = [];
const order = {
  orderNumber: 'BB-0123456789ABCDEF',
  customer: { email: 'buyer@example.com', phone: '9876543210', name: 'Buyer Name' },
  status: 'new',
  paymentStatus: 'paid',
  totalPaise: 12500,
  createdAt: new Date('2026-11-10T12:00:00.000Z'),
  items: [{ name: 'Incense', variantLabel: '100 g', quantity: 2 }],
};
let server;
let baseUrl;

const ContactInquiry = {
  create: async (input) => {
    const inquiry = { ...input, _id: String(inquiries.length + 1) };
    inquiries.push(inquiry);
    return inquiry;
  },
};

const Order = {
  findOne: async (filter) => (
    filter.orderNumber === order.orderNumber
    && filter['customer.email'] === order.customer.email
      ? order
      : null
  ),
};

before(async () => {
  server = createApp({ uiOrigin, ContactInquiry, Order }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const post = (path, body) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: { Origin: uiOrigin, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('contact requests are validated and saved with normalized email', async () => {
  const invalid = await post('/api/contact', {
    name: 'A',
    email: 'not-an-email',
    subject: 'Help',
    message: 'Too short',
  });
  assert.equal(invalid.status, 400);

  const response = await post('/api/contact', {
    name: 'Shopper Name',
    email: 'SHOPPER@example.com',
    subject: 'Order question',
    message: 'Could you please help me with my recent order?',
  });
  assert.equal(response.status, 201);
  assert.equal(inquiries.length, 1);
  assert.equal(inquiries[0].email, 'shopper@example.com');
  assert.equal(inquiries[0].phone, '');
});

test('order tracking requires matching order number and checkout email and returns limited details', async () => {
  const mismatch = await post('/api/orders/track', {
    orderNumber: order.orderNumber,
    email: 'someone-else@example.com',
  });
  assert.equal(mismatch.status, 404);

  const response = await post('/api/orders/track', {
    orderNumber: order.orderNumber.toLowerCase(),
    email: order.customer.email.toUpperCase(),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.order.items, [{ name: 'Incense', variantLabel: '100 g', quantity: 2 }]);
  assert.equal(result.order.orderNumber, order.orderNumber);
  assert.equal('customer' in result.order, false);
  assert.equal('razorpayOrderId' in result.order, false);
});
