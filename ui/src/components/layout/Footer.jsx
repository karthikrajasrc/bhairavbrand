import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import Reveal from '../ui/Reveal.jsx';

export default function Footer() {
  const { notify } = useCart();
  const stub = (label) => (e) => { e.preventDefault(); notify(`${label} page – connect to your CMS`); };
  return (
    <footer>
      <div className="w">
        <Reveal className="fg rev-stagger">
          <div>
            <Link className="logo" to="/" style={{ padding: 0 }}>
              <img src="/assets/logo.jpg" width="180" height="120" alt="Banyan Basket" />
            </Link>
            <p>Rooted in tradition and crafted with care, Banyan Basket delivers pure staples, authentic Indian groceries and natural wellness essentials for modern families.</p>
            <form className="nl" onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); notify('Thanks for subscribing!'); }}>
              <input type="email" required placeholder="Email" aria-label="Email address" />
              <button>Subscribe</button>
            </form>
          </div>
          <div>
            <h3>Explore</h3>
            <Link to="/collections/oils">Cold-Pressed Oils</Link>
            <Link to="/collections/ghee">Pure Cow Ghee</Link>
            <Link to="/collections/snacks">Traditional Snacks</Link>
            <Link to="/collections/staples">Wellness &amp; Pantry</Link>
            <Link to="/collections/combos">Combo Packs</Link>
          </div>
          <div>
            <h3>Quick links</h3>
            <Link to="/about">About Us</Link>
            <a href="#why" onClick={stub('Why Switch?')}>Why Switch?</a>
            <a href="#faq" onClick={stub('FAQs')}>FAQs</a>
            <a href="#contact" onClick={stub('Contact Us')}>Contact Us</a>
          </div>
          <div>
            <h3>Certifications</h3>
            <span className="cert">✔ FSSAI Licensed</span>
            <span className="cert">🧪 Lab tested for quality &amp; purity</span>
          </div>
        </Reveal>
        <Reveal className="fb">
          <span>© 2026, Banyan Basket</span>
          <div className="pay"><span>VISA</span><span>Mastercard</span><span>RuPay</span><span>UPI</span><span>Amex</span></div>
          <nav>
            {['Privacy policy', 'Refund policy', 'Terms of service', 'Shipping policy'].map((l) => (
              <a key={l} href="#policy" onClick={stub(l)}>{l.split(' ')[0]}</a>
            ))}
          </nav>
        </Reveal>
      </div>
    </footer>
  );
}
