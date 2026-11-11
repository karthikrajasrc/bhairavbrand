import { useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../ui/ProductCard.jsx';
import Reveal from '../ui/Reveal.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';

export default function Combos() {
  const { roots, byCategory } = useCatalog();
  const category = roots.find((item) => (
    `${item.name} ${item.slug}`.toLowerCase().includes('combo')
  ));
  const products = category
    ? byCategory(category.slug).filter((product) => product.showOnHome === true)
    : [];
  const railRef = useRef(null);
  const scroll = (direction) => {
    railRef.current?.scrollBy({
      left: direction * railRef.current.clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  if (!products.length) {
    return (
      <section className="sec alt">
        <div className="w combo-empty">
          <Reveal>
            <span className="grocery-eyebrow">Pantry favourites, together</span>
            <h2>Our Combos</h2>
            <p>Choose “Show this product on the homepage” when adding a combo to feature it here.</p>
            <Link className="btn o" to="/collections/all">Browse all groceries</Link>
          </Reveal>
        </div>
      </section>
    );
  }
  return (
    <section className="sec alt combo-section">
      <div className="w">
        <Reveal className="combo-heading"><h2>Our Combos</h2></Reveal>
      </div>
      <div className="combo-carousel">
        <div className="rail combo-product-rail rev-stagger" id="home-combo-products" ref={railRef}>
          {products.map((p) => <ProductCard key={p._id} product={p} hoverSecondaryImage />)}
        </div>
        {products.length > 1 && (
          <div className="combo-carousel-controls">
            <button className="combo-scroll-button" type="button" aria-label="Scroll combos left"
              aria-controls="home-combo-products" onClick={() => scroll(-1)}>‹</button>
            <button className="combo-scroll-button" type="button" aria-label="Scroll combos right"
              aria-controls="home-combo-products" onClick={() => scroll(1)}>›</button>
          </div>
        )}
      </div>
    </section>
  );
}
