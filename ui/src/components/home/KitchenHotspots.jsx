import ProductCard from '../ui/ProductCard.jsx';
import Reveal from '../ui/Reveal.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';

export default function KitchenHotspots() {
  const { products } = useCatalog();
  const items = products.slice(0, 4);
  if (!items.length) return null;
  return (
    <section className="sec alt">
      <div className="w">
        <Reveal className="sh"><h2>Everything you need for your kitchen</h2></Reveal>
        <Reveal className="grid rev-stagger">{items.map((product) => <ProductCard key={product._id} product={product} />)}</Reveal>
      </div>
    </section>
  );
}
