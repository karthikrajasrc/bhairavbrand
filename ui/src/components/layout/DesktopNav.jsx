import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';

const collectionPath = (category, subcategory) => (
  subcategory
    ? `/collections/${category.slug}/${subcategory.slug}`
    : `/collections/${category.slug}`
);

export default function DesktopNav() {
  const { roots, childrenOf } = useCatalog();
  const [shopAllOpen, setShopAllOpen] = useState(false);
  const combos = roots.find((category) => category.slug === 'combos');
  return (
    <nav className="dk" aria-label="Main">
      <ul>
        {combos && <li><Link to={collectionPath(combos)}>Specials</Link></li>}
        <li
          className={`shop-all-item${shopAllOpen ? ' menu-open' : ''}`}
          onMouseEnter={() => setShopAllOpen(true)}
          onMouseLeave={() => setShopAllOpen(false)}
          onFocus={() => setShopAllOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setShopAllOpen(false);
          }}
        >
          <Link to="/collections/all" aria-haspopup="true" aria-expanded={shopAllOpen}
            onClick={() => setShopAllOpen(false)}>Shop All ▾</Link>
          <div className="dd shop-all-dropdown">
            <div className="mega mega-shop-all">
              {roots.map((category) => (
                <Link key={category._id} to={collectionPath(category)}
                  onClick={() => setShopAllOpen(false)}>
                  <i>{category.imageUrl && <img src={category.imageUrl} alt="" loading="lazy" />}</i>
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </li>
        <li>
          <Link to="/collections/all">Shop by Category ▾</Link>
          <div className="dd">
            <div className="cats">
              {roots.map((category) => (
                <div key={category._id}>
                  <Link className="nav-category-title" to={collectionPath(category)}>
                    {category.imageUrl && <img src={category.imageUrl} alt="" loading="lazy" />}
                    <b>{category.name}</b>
                  </Link>
                  {childrenOf(category).map((subcategory) => (
                    <Link key={subcategory._id} to={collectionPath(category, subcategory)}>
                      {subcategory.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </li>
        <li><Link to="/about">About Us</Link></li>
        <li><Link to="/collections/all" data-track>Track Order</Link></li>
      </ul>
    </nav>
  );
}
