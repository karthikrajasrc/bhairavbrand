import { useCart } from '../../context/CartContext.jsx';

export default function Toast() {
  const { toast } = useCart();
  return (
    <div
      className={`toast${toast ? ' on' : ''}${toast?.type === 'error' ? ' error' : ''}`}
      role={toast?.type === 'error' ? 'alert' : 'status'}
      aria-live={toast?.type === 'error' ? 'assertive' : 'polite'}
    >
      {toast?.message || ''}
    </div>
  );
}
