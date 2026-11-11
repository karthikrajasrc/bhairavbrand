import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';

export default function MobileDrawer({ open, onClose }) {
  const { roots, childrenOf } = useCatalog();
  return (
    <aside className={`dr l${open ? ' on' : ''}`} aria-label="Menu" aria-hidden={!open}>
      <div className="dh"><h3>Menu</h3><button className="ib" onClick={onClose} aria-label="Close menu">✕</button></div>
      <div className="db">
        <div className="row"><Link to="/collections/all">Shop all products</Link></div>
        {roots.map((category) => (
          <details key={category._id}>
            <summary>{category.name}</summary>
            <div>
              <Link to={`/collections/${category.slug}`}>All {category.name}</Link>
              {childrenOf(category).map((subcategory) => (
                <Link key={subcategory._id} to={`/collections/${category.slug}/${subcategory.slug}`}>
                  {subcategory.name}
                </Link>
              ))}
            </div>
          </details>
        ))}
        <div className="row"><Link to="/about">About Us</Link></div>
      </div>
    </aside>
  );
}
