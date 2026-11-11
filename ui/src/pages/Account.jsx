import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Reveal from '../components/ui/Reveal.jsx';

export default function Account() {
  const { user, loading, logout } = useAuth();
  const { notify } = useCart();
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <section className="auth-page"><p>Loading your account…</p></section>;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await logout();
      notify('Signed out.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <Reveal className="auth-card account-card">
        <p className="auth-eyebrow">Your account</p>
        <h1>Hello, {user.name}</h1>
        <p className="auth-intro">{user.email}</p>
        {user.role === 'admin' ? (
          <Link className="btn auth-submit" to="/admin">Open admin dashboard</Link>
        ) : (
          <Link className="btn auth-submit" to="/collections/all">Continue shopping</Link>
        )}
        <button className="auth-logout" disabled={submitting} onClick={handleLogout} type="button">
          {submitting ? 'Signing out…' : 'Sign out'}
        </button>
      </Reveal>
    </section>
  );
}
