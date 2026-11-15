import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductRail from '../components/ui/ProductRail.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import NotFound from './NotFound.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../data/products.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { getProductVariants, startingVariant } from '../data/productVariants.js';

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, categories, getProduct, loading, error } = useCatalog();
  const product = getProduct(id);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeDetail, setActiveDetail] = useState('');
  const { add, getItemQty, setQty: setCartQty, notify } = useCart();
  useEffect(() => {
    if (error) notify(error, 'error');
  }, [error, notify]);
  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedVariantId('');
    setActiveDetail('');
  }, [id]);
  if (loading) return <main className="w sec"><p>Loading product…</p></main>;
  if (!product) return <NotFound />;

  const images = Array.isArray(product.images) && product.images.length
    ? product.images.slice(0, 3)
    : [product.imageUrl];
  const variants = getProductVariants(product);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || startingVariant(product);
  const cartQty = getItemQty(product._id, selectedVariant.id);
  const cartKey = `${product._id}::${selectedVariant.id}`;
  const selectedDiscount = selectedVariant.mrp > selectedVariant.price
    ? Math.round((1 - selectedVariant.price / selectedVariant.mrp) * 100)
    : 0;
  const detailTabs = [
    { id: 'description', label: 'Description', content: product.description || product.shortDescription },
    { id: 'benefits', label: 'Product benefits', items: product.benefits },
    { id: 'nutrition', label: 'Nutritional information', content: product.nutritionInfo },
    { id: 'usage', label: 'How to use', content: product.howToUse },
    { id: 'storage', label: 'Storage instructions', content: product.storageInstructions },
  ].filter((tab) => tab.content || tab.items?.length);
  const selectedDetail = detailTabs.find((tab) => tab.id === activeDetail) || detailTabs[0];
  const related = products.filter((p) => p.category === product.category && p._id !== product._id).slice(0, 6);
  const category = categories.find((item) => item.slug === product.category);
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/collections/all', { replace: true });
  };
  return (
    <>
      <section className="sec" style={{ paddingBottom: 20 }}>
        <Reveal className="w pd">
          <div className="product-gallery">
            <button className="product-mobile-back" type="button" onClick={goBack}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5m7 7-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="big">
              <img src={images[selectedImageIndex] || product.imageUrl} alt={product.name} />
            </div>
            {images.length > 1 && (
              <div className="product-gallery-thumbnails" aria-label="Product images">
                {images.map((image, index) => (
                  <button className={`product-gallery-thumbnail${selectedImageIndex === index ? ' selected' : ''}`}
                    key={`${image}-${index}`} type="button" aria-label={`Show product image ${index + 1}`}
                    aria-pressed={selectedImageIndex === index} onClick={() => setSelectedImageIndex(index)}>
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="product-main-info">
            {category && <p className="product-category-label">{category.name}</p>}
            <h1>{product.name}</h1>
            <p className="product-pack-weight">Product weight: <b>{selectedVariant.label || 'Standard pack'}</b></p>
            {variants.length > 1 && (
              <div className="product-size-select">
                <span className="product-size-select-label" id="product-size-select-label">Available pack sizes</span>
                <div className="product-size-options" role="group" aria-labelledby="product-size-select-label">
                  {variants.map((variant) => (
                    <button className={`product-size-option${variant.id === selectedVariant.id ? ' selected' : ''}`}
                      key={variant.id} type="button" aria-pressed={variant.id === selectedVariant.id}
                      onClick={() => setSelectedVariantId(variant.id)}>
                      {variant.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {product.shortDescription && <p className="product-short-description">{product.shortDescription}</p>}
            {product.highlights?.length > 0 && (
              <ul className="product-highlights">
                {product.highlights.map((highlight, index) => <li key={`${highlight}-${index}`}>{highlight}</li>)}
              </ul>
            )}
          </div>
          <aside className="product-purchase-panel" aria-label="Purchase options">
            <p className="product-purchase-label">Price</p>
            <div className="pr">
              <b>{money(selectedVariant.price)}</b>
              {selectedDiscount > 0 && <>
                <s>{money(selectedVariant.mrp)}</s>
                <span className="tg" style={{ position: 'static' }}>Save {selectedDiscount}%</span>
              </>}
            </div>
            <div className={`buy${cartQty ? ' product-in-cart' : ''}`}>
              {cartQty ? (
                <>
                  <button className="btn product-added" disabled type="button">✓ Added</button>
                  <div className="q lg product-detail-cart-quantity" aria-label={`Quantity of ${product.name} in cart`}>
                    <button onClick={() => setCartQty(cartKey, cartQty - 1)}
                      aria-label={`Remove one ${product.name}`}>−</button>
                    <span aria-live="polite">{cartQty}</span>
                    <button disabled={cartQty >= 99} onClick={() => setCartQty(cartKey, cartQty + 1)}
                      aria-label={`Add one ${product.name}`}>+</button>
                  </div>
                </>
              ) : (
                <button className="btn" onClick={() => add(product._id, 1, selectedVariant)}>Add to cart</button>
              )}
            </div>
            <p className="product-delivery-note">Shipping and delivery charges are shown at checkout.</p>
          </aside>
        </Reveal>
      </section>
      {selectedDetail && (
        <section className="sec product-information">
          <Reveal className="w">
            <div className="product-detail-tabs" role="tablist" aria-label="Product information">
              {detailTabs.map((tab) => (
                <button id={`product-tab-${tab.id}`} key={tab.id} type="button" role="tab"
                  aria-selected={(selectedDetail.id === tab.id)}
                  aria-controls={`product-panel-${tab.id}`}
                  className={selectedDetail.id === tab.id ? 'active' : ''}
                  onClick={() => setActiveDetail(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>
            {detailTabs.map((tab) => (
              <div className="product-detail-panel" id={`product-panel-${tab.id}`} key={tab.id}
                role="tabpanel" aria-labelledby={`product-tab-${tab.id}`}
                hidden={selectedDetail.id !== tab.id}>
                <h2>{tab.label}</h2>
                {tab.items
                  ? <ul>{tab.items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
                  : <p>{tab.content}</p>}
              </div>
            ))}
          </Reveal>
        </section>
      )}
      {related.length > 0 && <ProductRail title="You may also like" category={product.category} limit={6} excludeId={product._id} />}
    </>
  );
}
