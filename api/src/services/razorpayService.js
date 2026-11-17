import { createHmac, timingSafeEqual } from 'node:crypto';

export class PaymentGatewayError extends Error {
  constructor() {
    super('Could not confirm payment with Razorpay. Please try again.');
    this.name = 'PaymentGatewayError';
  }
}

export function createRazorpayService({ keyId, keySecret, fetchImpl = globalThis.fetch }) {
  const isConfigured = Boolean(keyId && keySecret);

  const request = async (path, method, body) => {
    let response;
    try {
      response = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new PaymentGatewayError();
    }
    if (!response.ok) throw new PaymentGatewayError();
    try {
      return await response.json();
    } catch {
      throw new PaymentGatewayError();
    }
  };

  return {
    keyId,
    isConfigured,
    verifySignature(orderId, paymentId, signature) {
      const expected = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest();
      const received = Buffer.from(signature, 'hex');
      return timingSafeEqual(expected, received);
    },
    signCheckoutState(state) {
      const encodedState = Buffer.from(JSON.stringify(state)).toString('base64url');
      const signature = createHmac('sha256', keySecret).update(encodedState).digest('base64url');
      return `${encodedState}.${signature}`;
    },
    verifyCheckoutState(token) {
      const [encodedState, signature, ...extraParts] = token.split('.');
      if (!encodedState || !signature || extraParts.length) return null;
      const expected = createHmac('sha256', keySecret).update(encodedState).digest();
      const received = Buffer.from(signature, 'base64url');
      if (received.length !== expected.length || !timingSafeEqual(expected, received)) return null;
      try {
        return JSON.parse(Buffer.from(encodedState, 'base64url').toString('utf8'));
      } catch {
        return null;
      }
    },
    createOrder: (data) => request('/orders', 'POST', data),
    fetchPayment: (paymentId) => request(`/payments/${encodeURIComponent(paymentId)}`, 'GET'),
    capturePayment: (paymentId, amount) => request(
      `/payments/${encodeURIComponent(paymentId)}/capture`,
      'POST',
      { amount, currency: 'INR' },
    ),
  };
}
