import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';
import ProductCard from '../ui/ProductCard.jsx';
import Reveal from '../ui/Reveal.jsx';

export default function GroceryShelf() {
  const { products, categories } = useCatalog();
  const homeProducts = products;

  if (!homeProducts.length) return null;

  return (
    <section className="sec grocery-shelf" id="grocery-shelf">
      <div className="w">
        <Reveal className="grocery-shelf-heading">
          <div>
            <span className="grocery-eyebrow">Bhairav Brand collection</span>
            <h2>Explore all our products</h2>
          </div>
        </Reveal>

        {categories.length > 0 && homeProducts.length >= 4 && (
          <Reveal className="grocery-category-links" aria-label="Browse product categories">
            <Link to="/collections/all">All products</Link>
            {categories.slice(0, 6).map((category) => (
              <Link key={category._id} to={`/collections/${category.slug}`}>{category.name}</Link>
            ))}
          </Reveal>
        )}

        <Reveal className={`grid grocery-product-grid rev-stagger${homeProducts.length < 4 ? ' grocery-product-grid-limited' : ''}`}>
          {homeProducts.map((product) => (
            <ProductCard key={product._id} product={product} hoverSecondaryImage />
          ))}
        </Reveal>

        <div className="grocery-shelf-footer">
          <span>{homeProducts.length} {homeProducts.length === 1 ? 'product' : 'products'} to explore</span>
          <Link className="btn o" to="/collections/all">Browse all products</Link>
        </div>
      </div>
    </section>
  );
}
