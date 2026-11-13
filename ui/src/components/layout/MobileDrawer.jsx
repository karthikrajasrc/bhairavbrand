import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';

export default function MobileDrawer({ open, onClose }) {
  const { categories } = useCatalog();
  return (
    <aside className={`dr l${open ? ' on' : ''}`} aria-label="Menu" aria-hidden={!open}>
      <div className="dh"><h3>Menu</h3><button className="ib" onClick={onClose} aria-label="Close menu">✕</button></div>
      <div className="db">
        <div className="row"><Link to="/" onClick={onClose}>Home</Link></div>
        <details>
          <summary>Products</summary>
          <div>
            <Link to="/collections/all" onClick={onClose}>All products</Link>
            {categories.map((category) => (
              <Link key={category._id} to={`/collections/${category.slug}`} onClick={onClose}>
                {category.name}
              </Link>
            ))}
          </div>
        </details>
        <div className="row"><Link to="/about" onClick={onClose}>About</Link></div>
        <div className="row"><a href="#contact" onClick={onClose}>Contact Us</a></div>
        <div className="row"><Link to="/collections/all" data-track onClick={onClose}>Track Order</Link></div>
      </div>
    </aside>
  );
}
