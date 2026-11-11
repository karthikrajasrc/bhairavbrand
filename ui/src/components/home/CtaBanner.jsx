import { Link } from 'react-router-dom';
import Reveal from '../ui/Reveal.jsx';

export default function CtaBanner() {
  return (
    <section className="sec" style={{ paddingTop: 0 }}>
      <Reveal className="cta">
        <div>
          <small>A little note for your pantry</small>
          <h2>Your next grocery run starts with what you love.</h2>
          <p>Restocking a staple, planning a snack shelf or just looking around? Find your favourites and make a basket that feels like yours.</p>
          <Link className="btn" to="/collections/all">Start your grocery run</Link>
        </div>
        <aside className="pantry-note" aria-label="A little pantry list">
          <span className="pantry-note-label">A LITTLE PANTRY LIST</span>
          <h3>For the week ahead</h3>
          <ul>
            <li><span aria-hidden="true">✓</span> Something for everyday</li>
            <li><span aria-hidden="true">✓</span> Something for snack time</li>
            <li><span aria-hidden="true">✓</span> Something new to try</li>
          </ul>
          <span className="pantry-note-foot">Your basket, your way.</span>
        </aside>
      </Reveal>
    </section>
  );
}
