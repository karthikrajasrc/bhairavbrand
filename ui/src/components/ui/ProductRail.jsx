import { useRef } from 'react';
import ProductCard from './ProductCard.jsx';
import Reveal from './Reveal.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';

// Horizontal scroll-snap rail with arrow buttons. Reused for several home sections.
export default function ProductRail({ title, category, offset = 0, limit = 6, excludeId }) {
  const ref = useRef(null);
  const { byCategory } = useCatalog();
  const products = byCategory(category || 'all').filter((product) => product._id !== excludeId).slice(offset, offset + limit);
  if (!products.length) return null;
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="sec">
      <div className="w">
        <Reveal className="sh">
          <h2>{title}</h2>
          <div className="tr">
            <button onClick={() => scroll(-1)} aria-label="Previous">‹</button>
            <button onClick={() => scroll(1)} aria-label="Next">›</button>
          </div>
        </Reveal>
        <Reveal className="rev-stagger">
          <div className="rail rev-stagger" ref={ref}>
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
