import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext.jsx';
import Icon from '../ui/Icon.jsx';
import Reveal from '../ui/Reveal.jsx';

const mealMoments = [
  {
    title: 'The everyday tadka',
    text: 'Oil, ghee and spices are the little starts behind so many comforting meals.',
    terms: ['oil', 'ghee', 'spice', 'masala'],
    icon: '<path d="M4 10h13l2 3H6l-2-3Zm2 3v5h10v-5M9 10V7a2 2 0 0 1 4 0v3M19 6l2-2M19 6h3"/>',
  },
  {
    title: 'The chai-time pause',
    text: 'Give snack time its own shelf, with something crunchy, sweet or savoury.',
    terms: ['snack', 'nut', 'dry-fruit'],
    icon: '<path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 2h2a2 2 0 1 1 0 4h-2M8 4c0 1 1 1 1 2M12 3c0 1 1 1 1 2"/>',
  },
  {
    title: 'The weekend kitchen',
    text: 'Take your time, try a new combination and make the kitchen the best room in the house.',
    terms: ['grain', 'staple', 'spice', 'oil'],
    icon: '<path d="M4 12h16a8 8 0 0 1-16 0Zm2 0a6 6 0 0 1 12 0M12 4v2M5 7l2 2M19 7l-2 2"/>',
  },
  {
    title: 'The pantry top-up',
    text: 'Running low on a favourite? Take a quick look through the grocery aisles.',
    terms: [],
    icon: '<path d="M3 9h18l-2 11H5L3 9Zm4 0 5-6 5 6M9 13v3m6-3v3"/>',
  },
];

export default function Process() {
  const { roots } = useCatalog();

  return (
    <section className="sec meal-moments">
      <div className="w">
        <Reveal className="cen meal-moments-heading">
          <span className="grocery-eyebrow">A little inspiration for your next shop</span>
          <h2>What kind of pantry day is it?</h2>
          <p>From everyday cooking to that well-earned snack break, find a good place to start.</p>
        </Reveal>
        <Reveal className="meal-moments-grid rev-stagger">
          {mealMoments.map((moment) => {
            const category = roots.find((item) => moment.terms.some((term) => (
              `${item.name} ${item.slug}`.toLowerCase().includes(term)
            )));
            return (
              <Link
                className="meal-moment-card"
                key={moment.title}
                to={category ? `/collections/${category.slug}` : '/collections/all'}
              >
                <span className="meal-moment-icon"><Icon d={moment.icon} size={30} /></span>
                <span className="meal-moment-title">{moment.title}</span>
                <span className="meal-moment-copy">{moment.text}</span>
                <span className="meal-moment-link">Find your aisle <span aria-hidden="true">→</span></span>
              </Link>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
