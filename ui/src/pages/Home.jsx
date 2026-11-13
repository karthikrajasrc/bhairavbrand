import Hero from '../components/home/Hero.jsx';
import CategoryShortcuts from '../components/home/CategoryShortcuts.jsx';
import GroceryShelf from '../components/home/GroceryShelf.jsx';
import Testimonials from '../components/home/Testimonials.jsx';

export default function Home() {
  return (
    <>
      <CategoryShortcuts />
      <Hero />
      <GroceryShelf />
      <Testimonials />
    </>
  );
}
