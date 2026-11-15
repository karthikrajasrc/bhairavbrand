import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader.jsx';
import { apiRequest } from '../context/AuthContext.jsx';
import { money } from '../data/products.js';

const statusLabel = (status) => ({
  pending_payment: 'Payment pending',
  new: 'Order received',
}[status] || status.replaceAll('_', ' '));

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await apiRequest('/api/orders/track', {
        method: 'POST',
        body: { orderNumber, email },
      });
      setOrder(result.order);
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
          <p>Enter your order number and the email used at checkout to see its latest status.</p>
        </div>
        <form className="support-panel support-form track-form" onSubmit={submit}>
          <label className="checkout-field support-field-wide">
            Order number
            <input autoCapitalize="characters" autoComplete="off" maxLength="40" required
              placeholder="For example, BB-0123456789ABCDEF"
              value={orderNumber} onChange={(event) => setOrderNumber(event.target.value.toUpperCase())} />
          </label>
          <label className="checkout-field support-field-wide">
            Checkout email
            <input autoComplete="email" maxLength="254" required type="email"
              value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="btn support-submit" disabled={loading} type="submit">
            {loading ? 'Checking…' : 'Track order'}
          </button>
        </form>
        {order && (
          <section className="support-panel track-result" aria-live="polite">
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
        )}
      </section>
    </>
  );
}
