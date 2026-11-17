import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import AdminConfirmDialog from '../components/admin/AdminConfirmDialog.jsx';
import AdminSpinner from '../components/admin/AdminSpinner.jsx';

export default function AdminProducts() {
  const {
    categoryBySlug,
    products,
    loading,
    error,
    removeProduct: removeCatalogProduct,
  } = useCatalog();
  const { notify } = useCart();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.notice) {
      notify(location.state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, notify]);

  const removeProduct = async (product) => {
    setBusyId(product._id);
    try {
      await apiRequest(`/api/admin/products/${product._id}`, { method: 'DELETE' });
      removeCatalogProduct(product._id);
      notify('Product removed.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  const confirmRemoveProduct = (product) => setConfirmation({
    title: `Remove ${product.name}?`,
    message: 'This will permanently remove the product from your catalogue.',
    confirmLabel: 'Remove product',
    danger: true,
    onConfirm: () => {
      setConfirmation(null);
      return removeProduct(product);
    },
  });

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
        {loading ? <p className="admin-loading-state" role="status"><AdminSpinner /> Loading products…</p>
          : error ? <p className="admin-message error" role="alert">{error}</p>
          : products.length === 0 ? <p>No products yet. Add your first product to get started.</p> : (
          filteredProducts.length === 0
            ? <p role="status">No products match “{search}”.</p>
            : filteredProducts.map((product) => (
            <article className="admin-product-row admin-product-inventory-row" key={product._id}>
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
              <div className="admin-row-actions">
                <Link className="admin-edit" to={`/admin/products/${product._id}/edit`}>Edit</Link>
                <button className="admin-remove" disabled={busyId === product._id}
                  onClick={() => confirmRemoveProduct(product)} type="button">
                  {busyId === product._id ? <><AdminSpinner /> Removing…</> : 'Remove'}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      <AdminConfirmDialog confirmation={confirmation} onCancel={() => setConfirmation(null)} />
    </>
  );
}
