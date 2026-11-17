import { useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { apiRequest } from '../context/AuthContext.jsx';
import { money } from '../data/products.js';

const statusLabel = (status) => ({
  pending_payment: 'Payment pending',
  new: 'Order received',
  accepted: 'Your order is getting ready',
  dispatched: 'Your order has been dispatched',
}[status] || status.replaceAll('_', ' '));

export default function TrackOrder() {
  const [lookupMode, setLookupMode] = useState('order');
  const [orderNumber, setOrderNumber] = useState('');
  const [checkoutContact, setCheckoutContact] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setOrders([]);
    try {
      const body = lookupMode === 'phone'
        ? { phone: checkoutContact }
        : {
          orderNumber,
          ...(checkoutContact.includes('@') ? { email: checkoutContact } : { phone: checkoutContact }),
        };
      const result = await apiRequest('/api/orders/track', {
        method: 'POST',
        body,
      });
      setOrders(result.orders || [result.order]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Track Your Order" />
      <section className="support-page">
        <div className="support-intro">
          <p className="admin-eyebrow">Order updates</p>
          <h2>Where’s my order?</h2>
          <p>Look up an order by its order number or find orders using your checkout phone number.</p>
        </div>
        <div className="track-mode-switch" role="group" aria-label="Choose how to track your order">
          <button
            className={`track-mode-button${lookupMode === 'order' ? ' active' : ''}`}
            type="button"
            aria-pressed={lookupMode === 'order'}
            disabled={loading}
            onClick={() => { setLookupMode('order'); setCheckoutContact(''); setError(''); setOrders([]); }}
          >
            <Icon d={'<path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="m3.3 7.5 8.7 5 8.7-5"/><path d="M12 22V12.5"/><circle cx="18" cy="18" r="3"/><path d="m20.2 20.2 1.3 1.3"/>'} size={18} />
            Order number
          </button>
          <button
            className={`track-mode-button${lookupMode === 'phone' ? ' active' : ''}`}
            type="button"
            aria-pressed={lookupMode === 'phone'}
            disabled={loading}
            onClick={() => { setLookupMode('phone'); setCheckoutContact(''); setError(''); setOrders([]); }}
          >
            <Icon d={'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.08 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.69a2 2 0 0 1 1.74 2.04z"/>'} size={18} />
            Phone number
          </button>
        </div>
        <form className="support-panel support-form track-form" onSubmit={submit}>
          {lookupMode === 'order' ? (
            <>
              <label className="checkout-field support-field-wide">
                Order number
                <input autoCapitalize="characters" autoComplete="off" maxLength="40" required
                  placeholder="For example, BB-0123456789ABCDEF"
                  value={orderNumber} onChange={(event) => setOrderNumber(event.target.value.toUpperCase())} />
              </label>
              <label className="checkout-field support-field-wide">
                Checkout email or phone number
                <input autoCapitalize="none" autoComplete="off" maxLength="254" required
                  pattern={checkoutContact.includes('@') ? undefined : '[0-9]{10}'}
                  title="Enter a valid email or exactly 10 phone digits" type="text"
                  value={checkoutContact} onChange={(event) => setCheckoutContact(event.target.value)} />
              </label>
            </>
          ) : (
            <label className="checkout-field support-field-wide">
              Checkout phone number
              <input autoComplete="tel" inputMode="numeric" maxLength="10" minLength="10"
                pattern="[0-9]{10}" required title="Enter exactly 10 digits" type="tel"
                placeholder="10-digit mobile number"
                value={checkoutContact}
                onChange={(event) => setCheckoutContact(event.target.value.replace(/\D/g, '').slice(0, 10))} />
            </label>
          )}
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="btn support-submit" disabled={loading} type="submit">
            <Icon
              d={'<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/>'}
              size={18}
              strokeWidth={2}
            />
            {loading ? 'Checking…' : lookupMode === 'phone' ? 'Find orders' : 'Track order'}
          </button>
        </form>
        {orders.length > 0 && (
          <div className="track-results" aria-live="polite">
            {lookupMode === 'phone' && (
              <p role="status">{orders.length} {orders.length === 1 ? 'order' : 'orders'} found</p>
            )}
            {orders.map((order) => (
              <section className="support-panel track-result" key={order.orderNumber}>
                <div className="track-result-heading">
                  <div>
                    <p className="admin-eyebrow">Order {order.orderNumber}</p>
                    <h2>{statusLabel(order.status)}</h2>
                  </div>
                  <span className="admin-order-status">{order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}</span>
                </div>
                <p className="track-result-date">
                  Placed {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
                {order.status === 'dispatched' && order.trackingId && order.trackingUrl && (
                  <div className="track-shipment">
                    <p><strong>Tracking ID:</strong> {order.trackingId}</p>
                    <a href={order.trackingUrl} rel="noreferrer" target="_blank">Track shipment</a>
                  </div>
                )}
                <ul className="track-items">
                  {order.items.map((item, index) => (
                    <li key={`${item.name}-${item.variantLabel}-${index}`}>
                      <span>{item.name}{item.variantLabel ? ` · ${item.variantLabel}` : ''}</span>
                      <span>Qty {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                <p className="track-total"><strong>Order total</strong><strong>{money(order.totalPaise / 100)}</strong></p>
              </section>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
