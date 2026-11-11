import Hero from '../components/home/Hero.jsx';
import CategoryShortcuts from '../components/home/CategoryShortcuts.jsx';
import CategoryBundle from '../components/home/CategoryBundle.jsx';
import GroceryShelf from '../components/home/GroceryShelf.jsx';
import Combos from '../components/home/Combos.jsx';
import Process from '../components/home/Process.jsx';
import TrustStrip from '../components/home/TrustStrip.jsx';
import CtaBanner from '../components/home/CtaBanner.jsx';
import Testimonials from '../components/home/Testimonials.jsx';

export default function Home() {
  return (
    <>
      <CategoryShortcuts />
      <Hero />
      <CategoryBundle />
      <GroceryShelf />
      <Combos />
      <Process />
      <TrustStrip />
      <CtaBanner />
      <Testimonials />
    </>
  );
}
