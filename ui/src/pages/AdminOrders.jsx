import { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../data/products.js';

const formatDate = (value) => new Date(value).toLocaleString('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const orderStatusLabel = (status) => ({
  new: 'New',
  accepted: 'Accepted',
  dispatched: 'Dispatched',
}[status] || status.replaceAll('_', ' '));

export default function AdminOrders() {
  const { notify } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dispatchingOrder, setDispatchingOrder] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState(() => new Set());
  const [trackingId, setTrackingId] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');

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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !normalizedSearch
      || (
      order.customer.name.toLowerCase().includes(normalizedSearch)
      || order.orderNumber.toLowerCase().includes(normalizedSearch)
      );
    return matchesSearch && (statusFilter === 'all' || order.status === statusFilter);
  });

  const updateOrderStatus = async (order, update) => {
    setUpdatingOrderId(order._id);
    try {
      const { order: updatedOrder } = await apiRequest(`/api/admin/orders/${order._id}/status`, {
        method: 'PUT',
        body: update,
      });
      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder._id === order._id ? { ...currentOrder, ...updatedOrder } : currentOrder
      )));
      setDispatchingOrder(null);
      setConfirmingOrder(null);
      setTrackingId('');
      setTrackingUrl('');
      notify(
        updatedOrder.status === 'accepted' ? 'Order accepted. The customer can see it is being prepared.' : 'Order dispatched.',
        'success',
      );
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const submitDispatch = (event) => {
    event.preventDefault();
    if (!dispatchingOrder) return;
    updateOrderStatus(dispatchingOrder, {
      status: 'dispatched',
      trackingId,
      trackingUrl,
    });
  };

  const selectOrderStatus = (order, status) => {
    if (status === 'accepted') setConfirmingOrder(order);
    if (status === 'dispatched') {
      setTrackingId('');
      setTrackingUrl('');
      setDispatchingOrder(order);
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(orderId)) nextIds.delete(orderId);
      else nextIds.add(orderId);
      return nextIds;
    });
  };

  return (
    <>
      <div className="admin-page-title">
        <div>
          <p className="admin-eyebrow">Store sales</p>
          <h2>Orders</h2>
        </div>
        <div className="admin-title-actions">
          {orders.length > 0 && (
            <input
              className="admin-title-search"
              type="search"
              aria-label="Search orders by customer name or order number"
              placeholder="Search name or order number"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          )}
          {orders.length > 0 && (
            <select
              className="admin-orders-status-filter"
              aria-label="Filter orders by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="accepted">Accepted</option>
              <option value="dispatched">Dispatched</option>
            </select>
          )}
          <span className="admin-product-count">{orders.length} paid {orders.length === 1 ? 'order' : 'orders'}</span>
        </div>
      </div>
      <p className="admin-form-intro admin-orders-intro">Orders appear here after Razorpay confirms payment.</p>
      {loading ? <p className="admin-message" role="status">Loading orders…</p>
        : orders.length === 0 ? (
          <div className="admin-panel admin-orders-empty">
            <h3>No paid orders yet</h3>
            <p>Orders will appear here after a customer completes checkout and payment is confirmed.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-panel admin-orders-empty">
            <h3>No matching orders</h3>
            <p>Try a different search or order status.</p>
          </div>
        ) : (
          <section className="admin-orders-list" aria-label="Paid customer orders">
            {filteredOrders.map((order) => {
              const detailsExpanded = expandedOrderIds.has(order._id);
              const detailsId = `admin-order-details-${order._id}`;
              return (
              <article
                className={`admin-panel admin-order-card${detailsExpanded ? ' details-expanded' : ''}`}
                key={order._id}
              >
                <div className="admin-order-header">
                  <div>
                    <p className="admin-eyebrow">Order {order.orderNumber}</p>
                    <h3>{order.customer.name}</h3>
                    <p className="admin-order-contact">
                      <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                      <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
                    </p>
                  </div>
                  <div className="admin-order-actions">
                    <select
                      className="admin-order-status-select"
                      aria-label={`Update status for order ${order.orderNumber}`}
                      disabled={Boolean(updatingOrderId)}
                      value={order.status}
                      onChange={(event) => selectOrderStatus(order, event.target.value)}
                    >
                      <option value="new" disabled={order.status !== 'new'}>New</option>
                      <option value="accepted" disabled={order.status === 'dispatched'}>Accepted</option>
                      <option value="dispatched" disabled={order.status !== 'accepted' && order.status !== 'dispatched'}>
                        Dispatched
                      </option>
                    </select>
                    {order.status === 'dispatched' && (
                      <div className="admin-order-tracking">
                        <small>Tracking ID</small>
                        <a href={order.trackingUrl} rel="noreferrer" target="_blank">{order.trackingId}</a>
                      </div>
                    )}
                  </div>
                  <div className="admin-order-meta">
                    <span className={`admin-order-status admin-order-status-${order.status}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                    <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
                    <strong>{money(order.totalPaise / 100)}</strong>
                  </div>
                </div>
                <button
                  className="admin-order-details-toggle"
                  type="button"
                  aria-expanded={detailsExpanded}
                  aria-controls={detailsId}
                  onClick={() => toggleOrderDetails(order._id)}
                >
                  {detailsExpanded ? 'Hide order details' : 'View order details'}
                </button>
                <div className="admin-order-expanded-content" id={detailsId}>
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
                </div>
              </article>
              );
            })}
          </section>
        )}
      {confirmingOrder && (
        <div className="admin-modal-backdrop">
          <section
            className="admin-dispatch-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-accept-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setConfirmingOrder(null);
            }}
          >
            <h3 id="admin-accept-title">Accept order {confirmingOrder.orderNumber}?</h3>
            <p>The customer will see that their order is getting ready.</p>
            <div className="admin-dispatch-actions">
              <button
                className="btn o"
                disabled={Boolean(updatingOrderId)}
                onClick={() => setConfirmingOrder(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="btn"
                disabled={Boolean(updatingOrderId)}
                onClick={() => updateOrderStatus(confirmingOrder, { status: 'accepted' })}
                type="button"
              >
                {updatingOrderId ? 'Saving…' : 'Confirm acceptance'}
              </button>
            </div>
          </section>
        </div>
      )}
      {dispatchingOrder && (
        <div className="admin-modal-backdrop">
          <section
            className="admin-dispatch-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dispatch-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setDispatchingOrder(null);
            }}
          >
            <h3 id="admin-dispatch-title">Dispatch order {dispatchingOrder.orderNumber}</h3>
            <p>Enter the shipment tracking details to share them with the customer.</p>
            <form className="admin-dispatch-form" onSubmit={submitDispatch}>
              <label>
                Tracking ID
                <input
                  autoFocus
                  autoComplete="off"
                  maxLength="120"
                  required
                  value={trackingId}
                  onChange={(event) => setTrackingId(event.target.value)}
                />
              </label>
              <label>
                Tracking link
                <input
                  autoComplete="url"
                  maxLength="2048"
                  pattern="https://.*"
                  placeholder="https://carrier.example/track/..."
                  required
                  title="Enter a valid HTTPS tracking link"
                  type="url"
                  value={trackingUrl}
                  onChange={(event) => setTrackingUrl(event.target.value)}
                />
              </label>
              <div className="admin-dispatch-actions">
                <button className="btn o" disabled={Boolean(updatingOrderId)} onClick={() => setDispatchingOrder(null)} type="button">
                  Cancel
                </button>
                <button className="btn" disabled={Boolean(updatingOrderId)} type="submit">
                  {updatingOrderId ? 'Saving…' : 'Confirm dispatch'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
