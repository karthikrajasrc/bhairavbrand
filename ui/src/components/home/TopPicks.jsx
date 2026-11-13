import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../ui/ProductCard.jsx';
import Reveal from '../ui/Reveal.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';

export default function TopPicks() {
  const { categories: allCategories, byCategory } = useCatalog();
  const categories = allCategories.slice(0, 4);
  const [tab, setTab] = useState('');
  const activeTab = categories.some((category) => category.slug === tab) ? tab : categories[0]?.slug;
  const products = byCategory(activeTab || 'all').slice(0, 8);
  if (!categories.length || !products.length) return null;
  return (
    <section className="sec" style={{ paddingTop: 20 }}>
      <div className="w">
        <Reveal className="sh">
          <h2>Our Top Picks</h2>
          <div className="tabs" role="tablist">
            {categories.map((category) => (
              <button key={category._id} role="tab" aria-selected={activeTab === category.slug} className={activeTab === category.slug ? 'on' : ''} onClick={() => setTab(category.slug)}>{category.name}</button>
            ))}
          </div>
        </Reveal>
        <Reveal className="grid rev-stagger">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </Reveal>
        <div className="ctr"><Link className="btn o" to={`/collections/${activeTab}`}>View all</Link></div>
      </div>
    </section>
  );
}
