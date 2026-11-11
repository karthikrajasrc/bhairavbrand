import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';
import ProductCard from '../ui/ProductCard.jsx';
import Reveal from '../ui/Reveal.jsx';

export default function GroceryShelf() {
  const { products, roots } = useCatalog();
  const comboCategory = roots.find((category) => (
    `${category.name} ${category.slug}`.toLowerCase().includes('combo')
  ));
  const groceryProducts = products.filter((product) => product.category !== comboCategory?.slug);
  const featuredProducts = groceryProducts
    .filter((product) => product.showOnHome === true);

  if (!featuredProducts.length) return null;

  return (
    <section className="sec grocery-shelf" id="grocery-shelf">
      <div className="w">
        <Reveal className="grocery-shelf-heading">
          <div>
            <span className="grocery-eyebrow">Good things for your pantry</span>
            <h2>Everyday groceries, thoughtfully chosen</h2>
            <p>Discover pantry favourites for daily cooking, wholesome snacking and the little rituals that make a house feel like home.</p>
          </div>
          <Link className="link grocery-all-link" to="/collections/all">Shop all groceries <span aria-hidden="true">→</span></Link>
        </Reveal>

        {roots.length > 0 && featuredProducts.length >= 4 && (
          <Reveal className="grocery-category-links" aria-label="Browse grocery categories">
            <Link to="/collections/all">All groceries</Link>
            {roots.slice(0, 6).map((category) => (
              <Link key={category._id} to={`/collections/${category.slug}`}>{category.name}</Link>
            ))}
          </Reveal>
        )}

        <Reveal className={`grid grocery-product-grid rev-stagger${featuredProducts.length < 4 ? ' grocery-product-grid-limited' : ''}`}>
          {featuredProducts.map((product) => (
            <ProductCard key={product._id} product={product} hoverSecondaryImage />
          ))}
        </Reveal>

        <div className="grocery-shelf-footer">
          <span>{groceryProducts.length} {groceryProducts.length === 1 ? 'grocery to explore' : 'groceries to explore'}</span>
          <Link className="btn o" to="/collections/all">Explore the full pantry</Link>
        </div>
      </div>
    </section>
  );
}
