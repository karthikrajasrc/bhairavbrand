import { Link } from 'react-router-dom';
import DesktopNav from './DesktopNav.jsx';
import useScrolled from '../../hooks/useScrolled.js';
import { useCart } from '../../context/CartContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Header({ onMenu, onCart }) {
  const scrolled = useScrolled(30);
  const { count } = useCart();
  const { user } = useAuth();
  const accountPath = user?.role === 'admin' ? '/admin' : user ? '/account' : '/login';
  const accountLabel = user?.role === 'admin' ? 'Admin dashboard' : user ? 'Your account' : 'Sign in';
  return (
    <header className={scrolled ? 'sc' : ''}>
      <div className="top">
        <button className="ib menu-btn" onClick={onMenu} aria-label="Open menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <Link className="logo" to="/" aria-label="Bhairav Brand home">
          <img src="/assets/logo.png" width="156" height="156" alt="Bhairav Brand" />
        </Link>
        <DesktopNav />
        <div className="acts">
          <Link className="ib" to={accountPath} aria-label={accountLabel} title={accountLabel}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4-6 8-6s7 1.5 8 6" /></svg>
          </Link>
          <button className="ib" onClick={onCart} aria-label="Open cart">
            <svg width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h3l2.4 11h10l2-8H7" /><circle cx="10" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
            <span className="bd">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
