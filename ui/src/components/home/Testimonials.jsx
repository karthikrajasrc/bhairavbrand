import Reveal from '../ui/Reveal.jsx';
import { testimonials } from '../../data/content.js';

export default function Testimonials() {
  return (
    <section className="sec" style={{ paddingTop: 0 }}>
      <div className="w">
        <Reveal className="cen"><h2>Loved by Thousands</h2></Reveal>
        <Reveal className="rg rev-stagger">
          {testimonials.map((t) => (
            <blockquote className="rv" key={t.name}>
              <div className="st" aria-label="5 out of 5 stars">★★★★★</div>
              <b>{t.product}</b>
              <p>{t.text}</p>
              <div className="who"><span className="av">{t.name[0]}</span><b>{t.name}</b></div>
            </blockquote>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
