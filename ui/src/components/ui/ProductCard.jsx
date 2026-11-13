import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { money } from '../../data/products.js';
import { getProductVariants, startingVariant } from '../../data/productVariants.js';

export default function ProductCard({ product: p, hoverSecondaryImage = false }) {
  const { add } = useCart();
  const variants = getProductVariants(p);
  const [selectedVariantId, setSelectedVariantId] = useState(() => startingVariant(p).id);
  const variant = variants.find((item) => item.id === selectedVariantId) || startingVariant(p);
  const secondaryImage = hoverSecondaryImage && Array.isArray(p.images)
    ? p.images.find((image) => typeof image === 'string' && image && image !== p.imageUrl)
    : null;
  const off = variant.mrp > variant.price
    ? Math.round((1 - variant.price / variant.mrp) * 100)
    : 0;
  return (
    <article className={`card${secondaryImage ? ' has-secondary-image' : ''}`}>
      {off > 0 && <span className="tg">-{off}%</span>}
      <Link className="im" to={`/products/${p._id}`} aria-label={p.name}>
        <span className="product-card-image-frame">
          <img className="product-card-primary-image" src={p.imageUrl} alt={p.name} loading="lazy" />
          {secondaryImage && (
            <span className="product-card-secondary-image" aria-hidden="true">
              <img src={secondaryImage} alt="" loading="lazy" />
            </span>
          )}
        </span>
      </Link>
      <div className="in">
        <h3><Link to={`/products/${p._id}`}>{p.name}</Link></h3>
        {variants.length > 1 ? (
          <div className="product-card-size-picker" role="group" aria-label={`Choose a pack size for ${p.name}`}>
            <div className="product-card-size-options">
              {variants.map((item) => (
                <button
                  className={`product-card-size-option${item.id === variant.id ? ' selected' : ''}`}
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === variant.id}
                  onClick={() => setSelectedVariantId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : variant.label ? (
          <small className="product-card-size">{variant.label}</small>
        ) : null}
        <div className="pr"><b>{money(variant.price)}</b>{off > 0 && <s>{money(variant.mrp)}</s>}</div>
        <button className="add" aria-label={`Add ${p.name}${variant.label ? `, ${variant.label}` : ''} to cart`}
          onClick={() => add(p._id, 1, variant)}>
          Add to cart
          {variant.label && <span className="product-card-add-size"> · {variant.label}</span>}
        </button>
      </div>
    </article>
  );
}
