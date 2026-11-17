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
    filter.paymentStatus === 'paid'
    && order.paymentStatus === 'paid'
    && filter.orderNumber === order.orderNumber
      ? order
      : null
  ),
  find: (filter) => ({
    sort() { return this; },
    limit() {
      return Promise.resolve(
        filter.paymentStatus === 'paid'
          && order.paymentStatus === 'paid'
          && filter['customer.phone'].$regex.test(order.customer.phone)
          ? [order]
          : [],
      );
    },
  }),
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

test('order tracking requires matching order number and checkout email or phone and returns limited details', async () => {
  const mismatch = await post('/api/orders/track', {
    orderNumber: order.orderNumber,
    email: 'someone-else@example.com',
  });
  assert.equal(mismatch.status, 404);

  const invalidCredentials = await post('/api/orders/track', {
    orderNumber: order.orderNumber,
    email: order.customer.email,
    phone: '9876543210',
  });
  assert.equal(invalidCredentials.status, 400);

  const emailResponse = await post('/api/orders/track', {
    orderNumber: order.orderNumber.toLowerCase(),
    email: order.customer.email.toUpperCase(),
  });
  assert.equal(emailResponse.status, 200);

  const phoneResponse = await post('/api/orders/track', {
    orderNumber: order.orderNumber,
    phone: '9876543210',
  });
  assert.equal(phoneResponse.status, 200);

  const result = await phoneResponse.json();
  assert.deepEqual(result.order.items, [{ name: 'Incense', variantLabel: '100 g', quantity: 2 }]);
  assert.equal(result.order.orderNumber, order.orderNumber);
  assert.equal('customer' in result.order, false);
  assert.equal('razorpayOrderId' in result.order, false);

  const phoneLookupResponse = await post('/api/orders/track', {
    phone: '9876543210',
  });
  assert.equal(phoneLookupResponse.status, 200);
  const phoneLookup = await phoneLookupResponse.json();
  assert.deepEqual(phoneLookup.orders.map(({ orderNumber }) => orderNumber), [order.orderNumber]);
  assert.equal('customer' in phoneLookup.orders[0], false);

  const unmatchedPhoneLookup = await post('/api/orders/track', {
    phone: '9999999999',
  });
  assert.equal(unmatchedPhoneLookup.status, 404);

  order.paymentStatus = 'pending';
  const pendingPhoneLookup = await post('/api/orders/track', { phone: '9876543210' });
  assert.equal(pendingPhoneLookup.status, 404);

  order.paymentStatus = 'paid';
  order.status = 'dispatched';
  order.trackingId = 'TRACK-001';
  order.trackingUrl = 'https://carrier.example/track/TRACK-001';
  const dispatchedOrderResponse = await post('/api/orders/track', {
    orderNumber: order.orderNumber,
    email: order.customer.email,
  });
  assert.equal(dispatchedOrderResponse.status, 200);
  const dispatchedOrder = await dispatchedOrderResponse.json();
  assert.equal(dispatchedOrder.order.status, 'dispatched');
  assert.equal(dispatchedOrder.order.trackingId, 'TRACK-001');
  assert.equal(dispatchedOrder.order.trackingUrl, 'https://carrier.example/track/TRACK-001');
});
