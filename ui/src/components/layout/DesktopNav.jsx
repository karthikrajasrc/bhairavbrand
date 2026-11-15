import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';

export default function DesktopNav() {
  const { categories } = useCatalog();
  const [productsOpen, setProductsOpen] = useState(false);
  return (
    <nav className="dk" aria-label="Main">
      <ul>
        <li><Link to="/">Home</Link></li>
        <li
          className={`products-item${productsOpen ? ' menu-open' : ''}`}
          onMouseEnter={() => setProductsOpen(true)}
          onMouseLeave={() => setProductsOpen(false)}
          onFocus={() => setProductsOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setProductsOpen(false);
          }}
        >
          <Link to="/collections/all" aria-haspopup="true" aria-expanded={productsOpen}
            onClick={() => setProductsOpen(false)}>Products ▾</Link>
          <div className="dd products-dropdown">
            <div className="products-category-list">
              {categories.map((category) => (
                <Link key={category._id} to={`/collections/${category.slug}`}
                  onClick={() => setProductsOpen(false)}>
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </li>
        <li><Link to="/about">About</Link></li>
        <li><Link to="/contact">Contact Us</Link></li>
        <li><Link to="/track-order" data-track>Track Order</Link></li>
      </ul>
    </nav>
  );
}
