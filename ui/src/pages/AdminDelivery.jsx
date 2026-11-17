import { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import AdminConfirmDialog from '../components/admin/AdminConfirmDialog.jsx';
import AdminSpinner from '../components/admin/AdminSpinner.jsx';

export default function AdminDelivery() {
  const { notify } = useCart();
  const [deliveryRates, setDeliveryRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest('/api/admin/delivery-charges')
      .then((result) => {
        if (!Array.isArray(result.deliveryRates)) {
          throw new Error('The API returned invalid delivery settings.');
        }
        if (active) setDeliveryRates(result.deliveryRates);
      })
      .catch((requestError) => { if (active) notify(requestError.message, 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [notify]);

  const updateDeliveryRate = (state, field, value) => {
    setDeliveryRates((current) => current.map((rate) => (
      rate.state === state ? { ...rate, [field]: value } : rate
    )));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const result = await apiRequest('/api/admin/delivery-charges', {
        method: 'PUT',
        body: {
          deliveryRates: deliveryRates.map((rate) => ({
            ...rate,
            deliveryCharge: Number(rate.deliveryCharge),
          })),
        },
      });
      setDeliveryRates(result.deliveryRates);
      notify('Delivery settings saved.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    setConfirmation({
      title: 'Save state delivery settings?',
      message: 'Only enabled states will appear at checkout, and each state will use its own delivery charge.',
      confirmLabel: 'Save state settings',
      onConfirm: () => {
        setConfirmation(null);
        return saveSettings();
      },
    });
  };

  return (
    <>
      <div className="admin-page-title">
        <div><p className="admin-eyebrow">Store settings</p><h2>Delivery charges</h2></div>
      </div>
      {loading ? <p className="admin-loading-state" role="status"><AdminSpinner /> Loading delivery settings…</p> : (
        <form className="admin-panel admin-form admin-delivery-form" onSubmit={submit}>
          <p className="admin-form-intro admin-wide">
            Set a delivery charge for each state or union territory. Enable a state to list it at checkout.
            All states start disabled; enable the areas you serve before customers check out.
          </p>
          <div className="admin-delivery-rates admin-wide">
            {deliveryRates.map((rate) => (
              <div className="admin-delivery-rate" key={rate.state}>
                <label className="admin-delivery-state">
                  <input aria-label={`Offer delivery in ${rate.state}`} checked={rate.enabled}
                    onChange={(event) => updateDeliveryRate(rate.state, 'enabled', event.target.checked)}
                    type="checkbox" />
                  <span>{rate.state}</span>
                </label>
                <label className="admin-delivery-charge">
                  Delivery charge (₹)
                  <input aria-label={`Delivery charge for ${rate.state}`} min="0" max="100000"
                    onChange={(event) => updateDeliveryRate(rate.state, 'deliveryCharge', event.target.value)}
                    required step="0.01" type="number" value={rate.deliveryCharge} />
                </label>
              </div>
            ))}
          </div>
          <div className="admin-form-actions admin-wide">
            <button className="btn" disabled={saving || deliveryRates.length === 0} type="submit">
              {saving ? <><AdminSpinner /> Saving…</> : 'Save delivery settings'}
            </button>
          </div>
        </form>
      )}
      <AdminConfirmDialog confirmation={confirmation} onCancel={() => setConfirmation(null)} />
    </>
  );
}
