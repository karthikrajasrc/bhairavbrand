import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function AdminProducts() {
  const { categoryBySlug, refresh } = useCatalog();
  const { notify } = useCart();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.notice) {
      notify(location.state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, notify]);

  const loadProducts = useCallback(async () => {
    try {
      const result = await apiRequest('/api/admin/products');
      setProducts(result.products);
    } catch (requestError) {
      notify(requestError.message, 'error');
    }
  }, [notify]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const removeProduct = async (product) => {
    setBusyId(product._id);
    try {
      await apiRequest(`/api/admin/products/${product._id}`, { method: 'DELETE' });
      setProducts((current) => current.filter((item) => item._id !== product._id));
      notify('Product removed.');
      await refresh();
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const categoryName = categoryBySlug[product.category]?.name || product.category;
    return `${product.name} ${categoryName}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  return (
    <>
      <div className="admin-page-title">
        <div>
          <p className="admin-eyebrow">Catalogue</p>
          <div className="admin-product-title">
            <h2>Products</h2>
            <span className="admin-product-count" aria-live="polite">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>
        </div>
        <div className="admin-title-actions">
          <input
            aria-label="Search products"
            className="admin-title-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            type="search"
            value={search}
          />
          <Link className="btn" to="/admin/products/new">Add product</Link>
        </div>
      </div>
      <section className="admin-panel admin-record-list">
        {products.length === 0 ? <p>No products yet. Add your first product to get started.</p> : (
          filteredProducts.length === 0
            ? <p role="status">No products match “{search}”.</p>
            : filteredProducts.map((product) => (
            <article className="admin-product-row" key={product._id}>
              <span className="admin-product-art">
                {product.imageUrl && <img src={product.imageUrl} alt="" />}
              </span>
              <div className="admin-record-copy">
                <div className="admin-product-name">
                  <b>{product.name}</b>
                </div>
                <small>
                  {categoryBySlug[product.category]?.name || product.category}
                  {Array.isArray(product.variants) && product.variants.length > 0
                    ? ` · ${product.variants.map((variant) => `${variant.amount} ${variant.unit === 'l' ? 'L' : variant.unit} · ₹${variant.price}${variant.mrp > variant.price ? ` (MRP ₹${variant.mrp})` : ''}`).join(', ')}`
                    : ` · ₹${product.price}${product.mrp > product.price ? ` · MRP ₹${product.mrp}` : ''}`}
                  {Array.isArray(product.images) && product.images.length > 1 ? ` · ${product.images.length} images` : ''}
                </small>
              </div>
              <Link className="admin-edit" to={`/admin/products/${product._id}/edit`}>Edit</Link>
              <button className="admin-remove" disabled={busyId === product._id}
                onClick={() => removeProduct(product)} type="button">
                {busyId === product._id ? 'Removing…' : 'Remove'}
              </button>
            </article>
          ))
        )}
      </section>
    </>
  );
}
