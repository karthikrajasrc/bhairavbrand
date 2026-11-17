import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import AdminSpinner from './AdminSpinner.jsx';

const links = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/delivery', label: 'Delivery' },
  { to: '/admin/orders', label: 'Orders', badge: 'New' },
  { to: '/admin/reviews', label: 'Reviews' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { notify } = useCart();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      notify(error.message || 'Could not sign out. Please try again.', 'error');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div className="admin-brand">
            <p className="admin-eyebrow">Bhairav Brand</p>
            <h1>Store administration</h1>
            <p>Signed in as {user.email}</p>
          </div>
          <div className="admin-header-actions">
            <NavLink className="admin-store-link" to="/">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3 10 9-7 9 7" />
                <path d="M5.5 9v12h13V9M9 21v-6h6v6" />
              </svg>
              <span>Return to home</span>
            </NavLink>
            <button className="btn o" disabled={signingOut} onClick={signOut} type="button">
              {signingOut ? <><AdminSpinner /> Signing out…</> : 'Sign out'}
            </button>
          </div>
        </header>

        <nav className="admin-nav" aria-label="Admin navigation">
          {links.map(({ to, label, end, badge }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
              {label}{badge && <span className="admin-nav-new">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
