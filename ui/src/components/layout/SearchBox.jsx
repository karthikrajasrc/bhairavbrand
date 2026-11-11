import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../../data/products.js';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { startingVariant } from '../../data/productVariants.js';

export default function SearchBox() {
  const { products, categories, categoryBySlug } = useCatalog();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', away); document.removeEventListener('keydown', esc); };
  }, []);

  const v = term.trim().toLowerCase();
  const matches = v
    ? products.filter((p) => (
      p.name.toLowerCase().includes(v)
      || categoryBySlug[p.category]?.name.toLowerCase().includes(v)
    )).slice(0, 7)
    : [];

  return (
    <div className="sbox" ref={box}>
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="9" cy="9" r="6.5" /><path d="m14 14 4 4" />
      </svg>
      <input type="search" placeholder="Search your items..." autoComplete="off" aria-label="Search products"
        value={term} onChange={(e) => { setTerm(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      <div className={`res${open && v ? ' on' : ''}`}>
        {matches.length ? matches.map((p) => (
          <Link key={p._id} to={`/products/${p._id}`} onClick={() => { setOpen(false); setTerm(''); }}>
            <i><img src={p.imageUrl} alt="" /></i>
            <span style={{ flex: 1 }}>
              <b style={{ display: 'block', fontSize: 14 }}>{p.name}</b>
              <span style={{ color: 'var(--g)', fontWeight: 700 }}>
                {Array.isArray(p.variants) && p.variants.length > 1 ? 'From ' : ''}
                {money(startingVariant(p).price)}
              </span>
            </span>
          </Link>
        )) : <small>{categories.length ? 'No items found.' : 'No products have been added yet.'}</small>}
      </div>
    </div>
  );
}
