import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductRail from '../components/ui/ProductRail.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import NotFound from './NotFound.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../data/products.js';
import { useCatalog } from '../context/CatalogContext.jsx';
import { getProductVariants } from '../data/productVariants.js';

export default function Product() {
  const { id } = useParams();
  const { products, categories, getProduct, loading, error } = useCatalog();
  const product = getProduct(id);
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeDetail, setActiveDetail] = useState('');
  const { add, notify } = useCart();
  useEffect(() => {
    if (error) notify(error, 'error');
  }, [error, notify]);
  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedVariantId('');
    setQty(1);
    setActiveDetail('');
  }, [id]);
  if (loading) return <main className="w sec"><p>Loading product…</p></main>;
  if (!product) return <NotFound />;

  const images = Array.isArray(product.images) && product.images.length
    ? product.images.slice(0, 3)
    : [product.imageUrl];
  const variants = getProductVariants(product);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || variants[0];
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
  return (
    <>
      <nav className="w product-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">/</span>
        <Link to={`/collections/${product.category}`}>{category?.name || 'Shop'}</Link>
        <span aria-hidden="true">/</span><span aria-current="page">{product.name}</span>
      </nav>
      <section className="sec" style={{ paddingBottom: 20 }}>
        <Reveal className="w pd">
          <div className="product-gallery">
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
              <label className="product-size-select">Available pack sizes
                <select value={selectedVariant.id} onChange={(event) => setSelectedVariantId(event.target.value)}>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>{variant.label}</option>
                  ))}
                </select>
              </label>
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
            <div className="buy">
              <div className="q lg">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
              </div>
              <button className="btn" onClick={() => add(product._id, qty, selectedVariant)}>Add to cart</button>
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
