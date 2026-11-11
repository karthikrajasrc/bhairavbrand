import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import ProductCard from '../components/ui/ProductCard.jsx';
import NotFound from './NotFound.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const SORTS = {
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
};

export default function Collection() {
  const { slug, subcategory } = useParams();
  const [sort, setSort] = useState('featured');
  const { categories, categoryBySlug, byCategory, loading, error } = useCatalog();
  const { notify } = useCart();
  const category = categoryBySlug[slug];
  const subcategoryRecord = categoryBySlug[subcategory];
  const title = slug === 'all' ? 'All Products' : subcategoryRecord?.name || category?.name;
  const list = useMemo(() => {
    const matching = byCategory(slug, subcategory || '');
    return sort === 'featured' ? matching : [...matching].sort(SORTS[sort]);
  }, [byCategory, slug, sort, subcategory]);
  useEffect(() => {
    if (error) notify(error, 'error');
  }, [error, notify]);
  if (!loading && slug !== 'all' && (!category || category.parentId)) return <NotFound />;
  if (!loading && subcategory && (!subcategoryRecord || subcategoryRecord.parentId !== category?._id)) return <NotFound />;

  return (
    <>
      <PageHeader title={title || 'Shop'} crumbs={[{ label: 'Shop', to: '/collections/all' }, { label: title || 'Shop' }]} />
      <section className="sec" style={{ paddingTop: 36 }}>
        <div className="w">
          <Reveal className="tb">
            <div className="chips">
              <Link to="/collections/all" className={slug === 'all' ? 'on' : ''}>All Products</Link>
              {category && <Link to={`/collections/${slug}`} className={!subcategory ? 'on' : ''}>{category.name}</Link>}
              {category && categories
                .filter((item) => item.parentId === category._id)
                .map((item) => (
                  <Link key={item._id} to={`/collections/${slug}/${item.slug}`} className={subcategory === item.slug ? 'on' : ''}>{item.name}</Link>
                ))}
            </div>
            <label>
              <span style={{ marginRight: 8, color: 'var(--mut)' }}>{list.length} items · Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </Reveal>
          {loading ? <p>Loading products…</p> : (
            <Reveal className="grid rev-stagger">
              {list.map((p) => <ProductCard key={p._id} product={p} />)}
              {list.length === 0 && <p>No products in this collection yet.</p>}
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
