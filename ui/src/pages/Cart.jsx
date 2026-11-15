import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../data/products.js';

export default function Cart() {
  const { lines, count, subtotal, setQty } = useCart();

  return (
    <>
      <PageHeader title="Your Cart" />
      <section className="cart-page">
        {lines.length === 0 ? (
          <div className="checkout-panel checkout-empty cart-empty">
            <h2>Your cart is empty</h2>
            <p>Find something special for your everyday rituals.</p>
            <Link className="btn" to="/collections/all">Continue shopping</Link>
          </div>
        ) : (
          <div className="cart-page-layout">
            <section className="cart-page-items" aria-label="Cart items">
              <div className="cart-page-heading">
                <h2>Your items</h2>
                <span>{count} {count === 1 ? 'item' : 'items'}</span>
              </div>
              {lines.map(({ key, product, variant, qty }) => (
                <article className="cart-page-item" key={key}>
                  <Link className="cart-page-image" to={`/products/${product._id}`} aria-label={product.name}>
                    <img src={product.imageUrl} alt="" />
                  </Link>
                  <div className="cart-page-item-copy">
                    <h3><Link to={`/products/${product._id}`}>{product.name}</Link></h3>
                    {variant.label && <span className="cart-size-label">{variant.label}</span>}
                    <strong>{money(variant.price)}</strong>
                    <div className="q cart-page-quantity">
                      <button disabled={qty <= 1} onClick={() => setQty(key, qty - 1)}
                        aria-label={`Decrease ${product.name} quantity`}>−</button>
                      <span aria-live="polite">{qty}</span>
                      <button disabled={qty >= 99} onClick={() => setQty(key, qty + 1)}
                        aria-label={`Increase ${product.name} quantity`}>+</button>
                    </div>
                  </div>
                  <div className="cart-page-line-total">
                    <strong>{money(variant.price * qty)}</strong>
                    <button className="cart-page-remove" onClick={() => setQty(key, 0)} type="button">
                      Remove
                    </button>
                  </div>
                </article>
              ))}
              <Link className="link cart-continue" to="/collections/all">Continue shopping</Link>
            </section>
            <aside className="checkout-panel cart-page-summary">
              <h2>Order summary</h2>
              <p><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
              <p className="cart-shipping-note">Shipping and taxes are calculated at checkout.</p>
              <Link className="btn" to="/checkout">Proceed to checkout</Link>
              <div className="cart-summary-secure">Secure payment is handled by Razorpay.</div>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}
