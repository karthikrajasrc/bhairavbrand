import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../data/products.js';
import { WHATSAPP_NUMBER } from '../lib/contact.js';

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

const isCheckoutQuote = (quote, itemCount) => (
  quote
  && Array.isArray(quote.items)
  && quote.items.length === itemCount
  && quote.items.every((item) => (
    typeof item.productId === 'string'
    && typeof item.name === 'string'
    && Number.isSafeInteger(item.unitPricePaise)
    && Number.isSafeInteger(item.lineTotalPaise)
    && Number.isInteger(item.quantity)
  ))
  && Number.isSafeInteger(quote.subtotalPaise)
  && Number.isSafeInteger(quote.deliveryChargePaise)
  && Number.isSafeInteger(quote.totalPaise)
);

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
  const { lines, clear } = useCart();
  const formRef = useRef(null);
  const quoteRequestId = useRef(0);
  const checkoutItems = useMemo(() => lines.map(({ product, variant, qty }) => ({
    productId: product._id,
    variantId: String(variant.id),
    quantity: qty,
  })), [lines]);
  const [customer, setCustomer] = useState(initialCustomer);
  const [processing, setProcessing] = useState(false);
  const [preparingWhatsApp, setPreparingWhatsApp] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [verificationRetry, setVerificationRetry] = useState(null);
  const [serverTotals, setServerTotals] = useState(null);

  const fetchQuote = useCallback(async () => {
    const result = await apiRequest('/api/checkout/quote', {
      method: 'POST',
      body: { items: checkoutItems },
    });
    if (!isCheckoutQuote(result.quote, checkoutItems.length)) {
      throw new Error('The API returned invalid checkout prices.');
    }
    return result.quote;
  }, [checkoutItems]);

  const loadQuote = useCallback(async () => {
    const requestId = quoteRequestId.current + 1;
    quoteRequestId.current = requestId;
    if (checkoutItems.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError('');
      return;
    }
    setQuote(null);
    setServerTotals(null);
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const nextQuote = await fetchQuote();
      if (requestId === quoteRequestId.current) setQuote(nextQuote);
    } catch (requestError) {
      if (requestId === quoteRequestId.current) setQuoteError(requestError.message);
    } finally {
      if (requestId === quoteRequestId.current) setQuoteLoading(false);
    }
  }, [checkoutItems.length, fetchQuote]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  const setCustomerField = (field, value) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };
  const setAddressField = (field, value) => {
    setCustomer((current) => ({
      ...current,
      address: { ...current.address, [field]: value },
    }));
  };

  const orderViaWhatsApp = async () => {
    setError('');
    if (!formRef.current?.reportValidity()) return;
    const phoneDigits = customer.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setError('Enter a valid phone number with 10 to 15 digits.');
      return;
    }
    if (!quote || quoteLoading || quoteError) {
      setError('Current database prices are not available. Retry loading prices before continuing.');
      return;
    }

    const whatsappWindow = window.open('about:blank', '_blank');
    if (!whatsappWindow) {
      setError('Your browser blocked the WhatsApp tab. Allow pop-ups and try again.');
      return;
    }
    whatsappWindow.opener = null;
    setPreparingWhatsApp(true);
    try {
      const currentQuote = await fetchQuote();
      setQuote(currentQuote);
      setServerTotals(null);
      const address = [
        customer.address.line1,
        customer.address.line2,
        `${customer.address.city}, ${customer.address.state} ${customer.address.postalCode}`,
      ].filter(Boolean).join('\n');
      const productDetails = currentQuote.items.map((item, index) => (
        `${index + 1}. ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''} × ${item.quantity} — ${money(item.lineTotalPaise / 100)}`
      )).join('\n');
      const message = [
        'Hello Bhairav Brand, I would like to place this order via WhatsApp.',
        '',
        'Customer details:',
        `Name: ${customer.name}`,
        `Email: ${customer.email}`,
        `Phone: ${customer.phone}`,
        '',
        'Delivery address:',
        address,
        '',
        'Products:',
        productDetails,
        '',
        `Subtotal: ${money(currentQuote.subtotalPaise / 100)}`,
        `Delivery: ${currentQuote.deliveryChargePaise ? money(currentQuote.deliveryChargePaise / 100) : 'Free'}`,
        `Total amount: ${money(currentQuote.totalPaise / 100)}`,
      ].join('\n');
      whatsappWindow.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    } catch (requestError) {
      whatsappWindow.close();
      setError(`Could not prepare your WhatsApp order: ${requestError.message}`);
    } finally {
      setPreparingWhatsApp(false);
    }
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
    if (!quote || quoteLoading || quoteError) {
      setError('Current database prices are not available. Retry loading prices before continuing.');
      return;
    }
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
      if (isCheckoutQuote(order, checkoutItems.length)) setQuote(order);
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

  const displayedTotals = serverTotals || quote;

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
          <Link className="btn o" to="/track-order">Track this order</Link>
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
          <form className="checkout-panel checkout-form" id="checkout-details-form" onSubmit={submit} ref={formRef}>
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
          </form>

          <aside className="checkout-panel checkout-summary">
            <h2>Order summary</h2>
            <div className="checkout-summary-items">
              {quoteLoading && <p role="status">Loading current product prices and delivery charge…</p>}
              {quoteError && <p className="checkout-error" role="alert">
                Could not load current database prices: {quoteError}
              </p>}
              {quote?.items.map((item) => (
                <div className="checkout-summary-item" key={`${item.productId}:${item.variantId}`}>
                  <img src={item.imageUrl} alt="" />
                  <div>
                    <strong>{item.name}</strong>
                    {item.variantLabel && <small>{item.variantLabel}</small>}
                    <small>Qty: {item.quantity}</small>
                  </div>
                  <strong>{money(item.lineTotalPaise / 100)}</strong>
                </div>
              ))}
            </div>
            <div className="checkout-summary-total">
              <p><span>Subtotal</span><span>{displayedTotals
                ? money(displayedTotals.subtotalPaise / 100)
                : '—'}</span></p>
              <p><span>Delivery</span><span>{displayedTotals
                ? (displayedTotals.deliveryChargePaise
                  ? money(displayedTotals.deliveryChargePaise / 100)
                  : 'Free')
                : quoteError ? 'Unavailable' : '—'}</span></p>
              <p className="checkout-grand-total"><strong>Total</strong><strong>{displayedTotals
                ? money(displayedTotals.totalPaise / 100)
                : '—'}</strong></p>
            </div>
            <div className="checkout-summary-actions">
              {error && <p className="checkout-error" role="alert">{error}</p>}
              {quoteError && (
                <button className="btn o checkout-retry" disabled={quoteLoading || processing || preparingWhatsApp}
                  onClick={loadQuote} type="button">
                  Retry loading prices
                </button>
              )}
              {verificationRetry && (
                <button className="btn o checkout-retry" disabled={processing || preparingWhatsApp}
                  onClick={() => verifyPayment(verificationRetry.order, verificationRetry.payment)} type="button">
                  Retry payment verification
                </button>
              )}
              <button className="btn checkout-whatsapp"
                disabled={processing || preparingWhatsApp || quoteLoading || !quote || Boolean(quoteError)}
                onClick={orderViaWhatsApp} type="button">
                {preparingWhatsApp ? 'Preparing WhatsApp order…' : 'Order via WhatsApp'}
              </button>
              <button className="btn checkout-submit"
                disabled={processing || preparingWhatsApp || quoteLoading || !quote || Boolean(quoteError)}
                form="checkout-details-form" type="submit">
                <span>{processing ? 'Please wait…' : `PAY ${displayedTotals ? money(displayedTotals.totalPaise / 100) : ''}`}</span>
                <span className="checkout-payment-methods" aria-hidden="true">
                  <span className="checkout-payment-mark"><img src="/assets/payment-google-pay.jpg" alt="" /></span>
                  <span className="checkout-payment-mark checkout-payment-paytm"><img src="/assets/payment-paytm.jpg" alt="" /></span>
                  <span className="checkout-payment-mark checkout-payment-phonepe"><img src="/assets/payment-phonepe.jpg" alt="" /></span>
                  <span className="checkout-payment-mark"><img src="/assets/payment-bhim.jpg" alt="" /></span>
                </span>
              </button>
            </div>
            <p className="checkout-secure-note">
              Razorpay payments are verified by the server. WhatsApp opens with your order details ready to review and send.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
