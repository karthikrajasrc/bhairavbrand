import { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../data/products.js';

const formatDate = (value) => new Date(value).toLocaleString('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function AdminOrders() {
  const { notify } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest('/api/admin/orders')
      .then(({ orders: receivedOrders }) => {
        if (active) setOrders(receivedOrders);
      })
      .catch((requestError) => {
        if (active) notify(requestError.message, 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [notify]);

  return (
    <>
      <div className="admin-page-title">
        <div>
          <p className="admin-eyebrow">Store sales</p>
          <h2>Orders</h2>
        </div>
        <span className="admin-product-count">{orders.length} paid {orders.length === 1 ? 'order' : 'orders'}</span>
      </div>
      <p className="admin-form-intro admin-orders-intro">Orders appear here after Razorpay confirms payment.</p>
      {loading ? <p className="admin-message" role="status">Loading orders…</p>
        : orders.length === 0 ? (
          <div className="admin-panel admin-orders-empty">
            <h3>No paid orders yet</h3>
            <p>Orders will appear here after a customer completes checkout and payment is confirmed.</p>
          </div>
        ) : (
          <section className="admin-orders-list" aria-label="Paid customer orders">
            {orders.map((order) => (
              <article className="admin-panel admin-order-card" key={order._id}>
                <div className="admin-order-header">
                  <div>
                    <p className="admin-eyebrow">Order {order.orderNumber}</p>
                    <h3>{order.customer.name}</h3>
                    <p className="admin-order-contact">
                      <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                      <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
                    </p>
                  </div>
                  <div className="admin-order-meta">
                    <span className="admin-order-status">New</span>
                    <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
                    <strong>{money(order.totalPaise / 100)}</strong>
                  </div>
                </div>
                <div className="admin-order-details">
                  <div>
                    <h4>Items</h4>
                    <ul className="admin-order-items">
                      {order.items.map((item, index) => (
                        <li key={`${item.productId}-${item.variantId}-${index}`}>
                          <img src={item.imageUrl} alt="" />
                          <span>
                            <strong>{item.name}</strong>
                            {item.variantLabel && <small>{item.variantLabel}</small>}
                            <small>{item.quantity} × {money(item.unitPricePaise / 100)}</small>
                          </span>
                          <strong>{money(item.lineTotalPaise / 100)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="admin-order-address">
                    <h4>Delivery address</h4>
                    <p>{order.customer.address.line1}</p>
                    {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
                    <p>{order.customer.address.city}, {order.customer.address.state} {order.customer.address.postalCode}</p>
                  </div>
                </div>
                <div className="admin-order-footer">
                  <span>Payment confirmed</span>
                  <span>Subtotal {money(order.subtotalPaise / 100)}</span>
                  <span>Delivery {order.deliveryChargePaise
                    ? money(order.deliveryChargePaise / 100)
                    : 'Free'}</span>
                  <strong>Paid {money(order.totalPaise / 100)}</strong>
                </div>
              </article>
            ))}
          </section>
        )}
    </>
  );
}
