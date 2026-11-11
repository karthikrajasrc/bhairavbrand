import { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function AdminDelivery() {
  const { notify } = useCart();
  const [delivery, setDelivery] = useState({ deliveryCharge: 0, freeShippingThreshold: 999 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest('/api/admin/delivery-charges')
      .then((result) => { if (active) setDelivery(result); })
      .catch((requestError) => { if (active) notify(requestError.message, 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [notify]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await apiRequest('/api/admin/delivery-charges', {
        method: 'PUT',
        body: {
          deliveryCharge: Number(delivery.deliveryCharge),
          freeShippingThreshold: Number(delivery.freeShippingThreshold),
        },
      });
      setDelivery(result);
      notify('Delivery settings saved.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-page-title">
        <div><p className="admin-eyebrow">Store settings</p><h2>Delivery charges</h2></div>
      </div>
      {loading ? <p>Loading delivery settings…</p> : (
        <form className="admin-panel admin-form admin-delivery-form" onSubmit={submit}>
          <p className="admin-form-intro admin-wide">Set the standard delivery cost and the order amount at which delivery becomes free.</p>
          <label>Delivery charge (₹)
            <input min="0" required step="0.01" type="number" value={delivery.deliveryCharge}
              onChange={(event) => setDelivery({ ...delivery, deliveryCharge: event.target.value })} />
          </label>
          <label>Free delivery above (₹)
            <input min="0" required step="0.01" type="number" value={delivery.freeShippingThreshold}
              onChange={(event) => setDelivery({ ...delivery, freeShippingThreshold: event.target.value })} />
          </label>
          <div className="admin-form-actions admin-wide">
            <button className="btn" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save delivery settings'}</button>
          </div>
        </form>
      )}
    </>
  );
}
