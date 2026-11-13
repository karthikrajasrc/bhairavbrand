import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../data/products.js';

const initialCustomer = {
  name: '',
  email: '',
  phone: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
  },
};

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve();
  script.onerror = () => {
    script.remove();
    reject(new Error('Could not load Razorpay checkout. Please try again.'));
  };
  document.body.appendChild(script);
});

export default function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const [customer, setCustomer] = useState(initialCustomer);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [verificationRetry, setVerificationRetry] = useState(null);
  const [serverTotals, setServerTotals] = useState(null);

  const setCustomerField = (field, value) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };
  const setAddressField = (field, value) => {
    setCustomer((current) => ({
      ...current,
      address: { ...current.address, [field]: value },
    }));
  };

  const verifyPayment = async (order, payment) => {
    setProcessing(true);
    setError('');
    try {
      const result = await apiRequest(`/api/checkout/orders/${order.id}/verify`, {
        method: 'POST',
        body: payment,
      });
      clear();
      setVerificationRetry(null);
      setConfirmation(result.order);
    } catch (requestError) {
      setVerificationRetry({ order, payment });
      setError(`${requestError.message}. If your account was charged, retry verification before paying again.`);
    } finally {
      setProcessing(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError('');
    setVerificationRetry(null);
    setServerTotals(null);
    try {
      const result = await apiRequest('/api/checkout/orders', {
        method: 'POST',
        body: {
          customer,
          items: lines.map(({ product, variant, qty }) => ({
            productId: product._id,
            variantId: String(variant.id),
            quantity: qty,
          })),
        },
      });
      const { order } = result;
      setServerTotals(order);
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay checkout did not load. Please try again.');

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.totalPaise,
        currency: order.currency,
        name: 'Bhairav Brand',
        description: `Order ${order.orderNumber}`,
        image: '/assets/logo.png',
        order_id: order.razorpayOrderId,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        theme: { color: '#704109' },
        modal: { ondismiss: () => setProcessing(false) },
        handler: (payment) => verifyPayment(order, payment),
      });
      checkout.on('payment.failed', (payment) => {
        setError(payment.error?.description || 'Payment was not completed. You can try again.');
        setProcessing(false);
      });
      checkout.open();
    } catch (requestError) {
      setError(requestError.message);
      setProcessing(false);
    }
  };

  return (
    <section className="checkout-page">
      <div className="checkout-heading">
        <p className="admin-eyebrow">Secure checkout</p>
        <h1>{confirmation ? 'Order confirmed' : 'Complete your order'}</h1>
      </div>

      {confirmation ? (
        <div className="checkout-panel checkout-confirmation" role="status">
          <span className="checkout-confirmation-mark" aria-hidden="true">✓</span>
          <h2>Thank you for your order</h2>
          <p>Payment is confirmed. Your order number is <strong>{confirmation.orderNumber}</strong>.</p>
          <p>Total paid: <strong>{money(confirmation.totalPaise / 100)}</strong></p>
          <Link className="btn" to="/collections/all">Continue shopping</Link>
        </div>
      ) : lines.length === 0 ? (
        <div className="checkout-panel checkout-empty">
          <h2>Your cart is empty</h2>
          <p>Add products to your cart before checking out.</p>
          <Link className="btn" to="/collections/all">Browse products</Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <form className="checkout-panel checkout-form" onSubmit={submit}>
            <h2>Delivery details</h2>
            <label className="checkout-field">
              Full name
              <input autoComplete="name" maxLength="80" minLength="2" required
                value={customer.name} onChange={(event) => setCustomerField('name', event.target.value)} />
            </label>
            <label className="checkout-field">
              Email
              <input autoComplete="email" maxLength="254" required type="email"
                value={customer.email} onChange={(event) => setCustomerField('email', event.target.value)} />
            </label>
            <label className="checkout-field">
              Phone
              <input autoComplete="tel" maxLength="18" minLength="10" pattern="[0-9+ ()-]{10,18}"
                placeholder="10-digit mobile number" required type="tel"
                value={customer.phone} onChange={(event) => setCustomerField('phone', event.target.value)} />
            </label>
            <label className="checkout-field checkout-field-wide">
              Address
              <input autoComplete="address-line1" maxLength="160" minLength="5" required
                value={customer.address.line1} onChange={(event) => setAddressField('line1', event.target.value)} />
            </label>
            <label className="checkout-field checkout-field-wide">
              Apartment, suite, landmark (optional)
              <input autoComplete="address-line2" maxLength="160"
                value={customer.address.line2} onChange={(event) => setAddressField('line2', event.target.value)} />
            </label>
            <label className="checkout-field">
              City
              <input autoComplete="address-level2" maxLength="80" minLength="2" required
                value={customer.address.city} onChange={(event) => setAddressField('city', event.target.value)} />
            </label>
            <label className="checkout-field">
              State
              <input autoComplete="address-level1" maxLength="80" minLength="2" required
                value={customer.address.state} onChange={(event) => setAddressField('state', event.target.value)} />
            </label>
            <label className="checkout-field">
              PIN code
              <input autoComplete="postal-code" inputMode="numeric" maxLength="6" pattern="[0-9]{6}"
                placeholder="6-digit PIN code" required
                value={customer.address.postalCode}
                onChange={(event) => setAddressField('postalCode', event.target.value)} />
            </label>
            {error && <p className="checkout-error" role="alert">{error}</p>}
            {verificationRetry && (
              <button className="btn o checkout-retry" disabled={processing}
                onClick={() => verifyPayment(verificationRetry.order, verificationRetry.payment)} type="button">
                Retry payment verification
              </button>
            )}
            <button className="btn checkout-submit" disabled={processing} type="submit">
              {processing ? 'Please wait…' : 'Pay securely with Razorpay'}
            </button>
          </form>

          <aside className="checkout-panel checkout-summary">
            <h2>Order summary</h2>
            <div className="checkout-summary-items">
              {lines.map(({ key, product, variant, qty }) => (
                <div className="checkout-summary-item" key={key}>
                  <img src={product.imageUrl} alt="" />
                  <div>
                    <strong>{product.name}</strong>
                    {variant.label && <small>{variant.label}</small>}
                    <small>Qty: {qty}</small>
                  </div>
                  <strong>{money(variant.price * qty)}</strong>
                </div>
              ))}
            </div>
            <div className="checkout-summary-total">
              <p><span>Subtotal</span><span>{money((serverTotals?.subtotalPaise ?? Math.round(subtotal * 100)) / 100)}</span></p>
              <p><span>Delivery</span><span>{serverTotals
                ? (serverTotals.deliveryChargePaise ? money(serverTotals.deliveryChargePaise / 100) : 'Free')
                : 'Calculated at checkout'}</span></p>
              <p className="checkout-grand-total"><strong>Total</strong><strong>{serverTotals
                ? money(serverTotals.totalPaise / 100)
                : money(subtotal)}</strong></p>
            </div>
            <p className="checkout-secure-note">The server verifies and confirms your payment before sending this order to the store.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
