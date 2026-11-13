import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';

const links = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/delivery', label: 'Delivery' },
  { to: '/admin/orders', label: 'Orders', badge: 'New' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { notify } = useCart();
  const navigate = useNavigate();

  const signOut = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      notify(error.message || 'Could not sign out. Please try again.', 'error');
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
            <NavLink className="admin-store-link" to="/">View storefront</NavLink>
            <button className="btn o" onClick={signOut} type="button">Sign out</button>
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
