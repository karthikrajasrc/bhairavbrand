import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { INDIAN_STATES } from '../src/indianStates.js';

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
const settings = {
  deliveryRates: INDIAN_STATES.map((state) => ({
    state,
    deliveryCharge: state === 'Tamil Nadu' ? 35.5 : 0,
    enabled: state === 'Tamil Nadu' || state === 'Kerala',
  })),
};
const createdOrders = [];
const razorpayAmounts = [];
let currentRazorpayOrder;
let paymentAmountOverride = null;
let captureStatusOverride = null;
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
  findOne: async ({ razorpayOrderId }) => (
    createdOrders.find((order) => order.razorpayOrderId === razorpayOrderId) || null
  ),
};

before(async () => {
  server = createApp({
    Product,
    StoreSettings,
    Order,
    uiOrigin,
    razorpayKeyId: 'test_key',
    razorpayKeySecret: 'test_secret',
    fetchImpl: async (url, { method, body }) => {
      const { pathname } = new URL(url);
      if (pathname === '/v1/orders') {
        const requestBody = JSON.parse(body);
        razorpayAmounts.push(requestBody.amount);
        currentRazorpayOrder = {
          id: `order_${razorpayAmounts.length}`,
          amount: requestBody.amount,
          currency: requestBody.currency,
        };
        return {
          ok: true,
          json: async () => currentRazorpayOrder,
        };
      }
      if (pathname === '/v1/payments/pay_test001' && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            id: 'pay_test001',
            order_id: currentRazorpayOrder.id,
            amount: paymentAmountOverride ?? currentRazorpayOrder.amount,
            currency: 'INR',
            status: 'authorized',
          }),
        };
      }
      if (pathname === '/v1/payments/pay_test001/capture' && method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            id: 'pay_test001',
            order_id: currentRazorpayOrder.id,
            amount: currentRazorpayOrder.amount,
            currency: 'INR',
            status: captureStatusOverride ?? 'captured',
          }),
        };
      }
      throw new Error(`Unexpected Razorpay request: ${method} ${pathname}`);
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

test('checkout quote uses database prices and the selected state delivery charge', async () => {
  const response = await request('/api/checkout/quote', { items: [cartItem()], state: 'Tamil Nadu' });
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

test('delivery charges stay state-specific regardless of order subtotal', async () => {
  const response = await request('/api/checkout/quote', { items: [cartItem(12)], state: 'Tamil Nadu' });
  assert.equal(response.status, 200);
  const { quote } = await response.json();
  assert.equal(quote.subtotalPaise, 51000);
  assert.equal(quote.deliveryChargePaise, 3550);
  assert.equal(quote.totalPaise, 54550);
});

test('checkout supports zero-charge states and rejects disabled states', async () => {
  const zeroChargeResponse = await request('/api/checkout/quote', {
    items: [cartItem()],
    state: 'Kerala',
  });
  assert.equal(zeroChargeResponse.status, 200);
  assert.equal((await zeroChargeResponse.json()).quote.deliveryChargePaise, 0);

  const disabledStateResponse = await request('/api/checkout/quote', {
    items: [cartItem()],
    state: 'Punjab',
  });
  assert.equal(disabledStateResponse.status, 400);

  const invalidStateResponse = await request('/api/checkout/quote', {
    items: [cartItem()],
    state: 'Atlantis',
  });
  assert.equal(invalidStateResponse.status, 400);
});

test('checkout quote rejects client-supplied prices', async () => {
  const response = await request('/api/checkout/quote', {
    items: [{ ...cartItem(), price: 1 }],
    state: 'Tamil Nadu',
  });
  assert.equal(response.status, 400);
});

test('checkout stores an order only after Razorpay payment is verified and captured', async () => {
  const checkout = {
    customer: {
      name: 'Customer Name',
      email: 'customer@example.com',
      phone: '9876543210',
      address: {
        line1: '12 Temple Road',
        line2: '',
        city: 'Madurai',
        state: 'Tamil Nadu',
        postalCode: '625001',
      },
    },
    items: [cartItem()],
  };
  const disabledStateOrder = await request('/api/checkout/orders', {
    ...checkout,
    customer: {
      ...checkout.customer,
      address: { ...checkout.customer.address, state: 'Punjab' },
    },
  });
  assert.equal(disabledStateOrder.status, 400);
  assert.equal(razorpayAmounts.length, 0);

  const response = await request('/api/checkout/orders', {
    ...checkout,
  });
  assert.equal(response.status, 201);
  const { order } = await response.json();
  assert.equal(razorpayAmounts.at(-1), 7800);
  assert.equal(order.totalPaise, 7800);
  assert.equal(order.items[0].unitPricePaise, 4250);
  assert.equal(createdOrders.length, 0);

  for (const phone of ['987654321', '98765432101']) {
    const invalidResponse = await request('/api/checkout/orders', {
      ...checkout,
      customer: { ...checkout.customer, phone },
    });
    assert.equal(invalidResponse.status, 400);
  }

  const paymentId = 'pay_test001';
  const paymentSignature = createHmac('sha256', 'test_secret')
    .update(`${order.razorpayOrderId}|${paymentId}`)
    .digest('hex');
  const verification = {
    razorpay_order_id: order.razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: paymentSignature,
    checkoutToken: order.checkoutToken,
  };
  const invalidVerification = await request(
    `/api/checkout/orders/${order.razorpayOrderId}/verify`,
    { ...verification, razorpay_signature: '0'.repeat(64) },
  );
  assert.equal(invalidVerification.status, 400);
  assert.equal(createdOrders.length, 0);

  const tamperedTokenResponse = await request(
    `/api/checkout/orders/${order.razorpayOrderId}/verify`,
    { ...verification, checkoutToken: `${order.checkoutToken}x` },
  );
  assert.equal(tamperedTokenResponse.status, 400);
  assert.equal(createdOrders.length, 0);

  paymentAmountOverride = order.totalPaise + 1;
  const mismatchedAmountResponse = await request(
    `/api/checkout/orders/${order.razorpayOrderId}/verify`,
    verification,
  );
  assert.equal(mismatchedAmountResponse.status, 400);
  assert.equal(createdOrders.length, 0);
  paymentAmountOverride = null;

  captureStatusOverride = 'authorized';
  const uncapturedResponse = await request(
    `/api/checkout/orders/${order.razorpayOrderId}/verify`,
    verification,
  );
  assert.equal(uncapturedResponse.status, 409);
  assert.equal(createdOrders.length, 0);
  captureStatusOverride = null;

  const verifiedResponse = await request(
    `/api/checkout/orders/${order.razorpayOrderId}/verify`,
    verification,
  );
  assert.equal(verifiedResponse.status, 200);
  const verifiedOrder = (await verifiedResponse.json()).order;
  assert.equal(verifiedOrder.paymentStatus, 'paid');
  assert.equal(verifiedOrder.status, 'new');
  assert.equal(createdOrders.length, 1);
  assert.equal(createdOrders[0].deliveryChargePaise, 3550);

  const retryResponse = await request(
    `/api/checkout/orders/${order.razorpayOrderId}/verify`,
    verification,
  );
  assert.equal(retryResponse.status, 200);
  assert.equal(createdOrders.length, 1);
});
