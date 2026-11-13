import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Reveal from '../components/ui/Reveal.jsx';

const googleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { user, loading, register, login, loginWithGoogle } = useAuth();
  const { notify } = useCart();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const destination = user?.role === 'admin' ? '/admin' : '/account';
  if (!loading && user) return <Navigate to={destination} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const authenticatedUser = await (isSignup
        ? register(values)
        : login({ email: values.email, password: values.password }));
      notify(isSignup ? 'Account created.' : 'Signed in.');
      navigate(authenticatedUser.role === 'admin' ? '/admin' : '/account', { replace: true });
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const googleSuccess = async (response) => {
    if (!response.credential) {
      notify('Google did not return a sign-in credential. Please try again.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const authenticatedUser = await loginWithGoogle(response.credential);
      notify('Signed in.');
      navigate(authenticatedUser.role === 'admin' ? '/admin' : '/account', { replace: true });
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <Reveal className="auth-card">
        <p className="auth-eyebrow">Bhairav Brand</p>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-intro">
          {isSignup ? 'Sign up to make your next visit easier.' : 'Sign in to continue to your account.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <label>
              Full name
              <input
                autoComplete="name"
                maxLength={80}
                minLength={2}
                name="name"
                onChange={(event) => setValues({ ...values, name: event.target.value })}
                required
                value={values.name}
              />
            </label>
          )}
          <label>
            Email address
            <input
              autoComplete="email"
              maxLength={254}
              name="email"
              onChange={(event) => setValues({ ...values, email: event.target.value })}
              required
              type="email"
              value={values.email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              maxLength={72}
              minLength={isSignup ? 12 : 1}
              name="password"
              onChange={(event) => setValues({ ...values, password: event.target.value })}
              required
              type="password"
              value={values.password}
            />
            {isSignup && <small>Use at least 12 characters.</small>}
          </label>
          <button className="btn auth-submit" disabled={submitting} type="submit">
            {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider"><span>or continue with</span></div>
        {googleConfigured ? (
          <div className="google-login">
            <GoogleLogin
              onError={() => notify('Google sign-in failed. Please try again.', 'error')}
              onSuccess={googleSuccess}
              useOneTap={false}
            />
          </div>
        ) : (
          <p className="google-unavailable">Google sign-in is unavailable until a client ID is configured.</p>
        )}

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'New to Bhairav Brand?'}{' '}
          <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </Reveal>
    </section>
  );
}
