import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';
import Reveal from '../ui/Reveal.jsx';

export default function Footer() {
  const { categories } = useCatalog();
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <footer className="site-footer" id="contact">
      <div className="w">
        <Reveal className="site-footer-grid rev-stagger">
          <div className="site-footer-brand">
            <Link className="site-footer-logo" to="/" aria-label="Bhairav Brand home">
              <img src="/assets/logo.png" width="156" height="156" alt="Bhairav Brand" />
            </Link>
            <p>
              Devotional essentials and fragrances, thoughtfully chosen to make everyday
              rituals feel meaningful.
            </p>
            <span className="site-footer-tagline">Rooted in tradition. Made for everyday life.</span>
          </div>

          <nav className="site-footer-column" aria-label="Shop categories">
            <h2>Shop</h2>
            <Link to="/collections/all">Shop all</Link>
            {sortedCategories.map((category) => (
              <Link key={category._id} to={`/collections/${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </nav>

          <div className="site-footer-column">
            <h2>Discover</h2>
            <Link to="/">Home</Link>
            <Link to="/about">Our story</Link>
            <Link to="/account">Your account</Link>
            <div className="site-footer-assurance">
              <span className="site-footer-assurance-mark" aria-hidden="true">✓</span>
              <p>
                <strong>Secure checkout</strong>
                <span>Payments are handled securely by Razorpay.</span>
              </p>
            </div>
          </div>
        </Reveal>

        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} Bhairav Brand. All rights reserved.</span>
          <span>Made for meaningful everyday rituals.</span>
        </div>
      </div>
    </footer>
  );
}
