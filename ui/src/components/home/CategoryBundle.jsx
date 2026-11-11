import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';
import Reveal from '../ui/Reveal.jsx';

export default function CategoryBundle() {
  const { roots } = useCatalog();
  if (!roots.length) return null;
  return (
    <Reveal as="section" className="category-bundle rev-stagger" aria-label="Explore pantry categories">
      <div className="category-bundle-grid">
        {roots.map((category) => (
          <Link className="category-bundle-card" key={category._id} to={`/collections/${category.slug}`}>
            <span className="category-bundle-art" aria-hidden="true">
              {category.imageUrl && <img src={category.imageUrl} alt="" loading="lazy" />}
            </span>
            <span className="category-bundle-label">{category.name}</span>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}
