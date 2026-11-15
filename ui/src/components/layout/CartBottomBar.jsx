import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { money } from '../../data/products.js';

export default function CartBottomBar({ hidden = false }) {
  const { lines, count, subtotal } = useCart();
  if (hidden || count === 0) return null;

  const products = Array.from(new Map(lines.map(({ product }) => [product._id, product])).values());
  const visibleProducts = products.slice(0, 3);
  return (
    <aside className="cart-bottom-bar" aria-label="Cart summary">
      <div className="cart-bottom-products" aria-hidden="true">
        {visibleProducts.map((product) => (
          <img key={product._id} src={product.imageUrl} alt="" />
        ))}
        {products.length > visibleProducts.length && (
          <span className="cart-bottom-more">+{products.length - visibleProducts.length}</span>
        )}
      </div>
      <div className="cart-bottom-copy">
        <strong>{products.length} {products.length === 1 ? 'product' : 'products'} added</strong>
        <span>{money(subtotal)}</span>
      </div>
      <Link className="btn cart-bottom-link" to="/cart">
        View cart <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
