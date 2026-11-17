import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const inFlightGetRequests = new Map();

export function apiRequest(path, { method = 'GET', body } = {}) {
  const requestKey = method === 'GET' && body === undefined ? `${API_URL}${path}` : null;
  if (requestKey && inFlightGetRequests.has(requestKey)) {
    return inFlightGetRequests.get(requestKey);
  }

  const requestPromise = performApiRequest(path, { method, body });
  if (!requestKey) return requestPromise;

  const sharedRequestPromise = requestPromise.finally(() => {
    if (inFlightGetRequests.get(requestKey) === sharedRequestPromise) {
      inFlightGetRequests.delete(requestKey);
    }
  });
  inFlightGetRequests.set(requestKey, sharedRequestPromise);
  return sharedRequestPromise;
}

async function performApiRequest(path, { method = 'GET', body } = {}) {
  let response;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined || isFormData ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined || isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not connect to the API. Please try again.');
  }

  if (response.status === 204) return null;
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The API returned an invalid response. Please try again.');
  }
  if (!response.ok) {
    const fieldErrors = result.fields && Object.entries(result.fields)
      .flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages])
        .filter(Boolean)
        .map((message) => `${field}: ${message}`));
    const details = fieldErrors?.join('; ');
    throw new Error(details ? `${result.error || 'Please check the provided information'}: ${details}` : (
      result.error || 'The request could not be completed'
    ));
  }
  return result;
}

const request = (path, body) => apiRequest(path, {
  method: body === undefined ? 'GET' : 'POST',
  body,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    request('/api/auth/me')
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const authenticate = useCallback(async (path, values) => {
    const result = await request(path, values);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback((values) => authenticate('/api/auth/register', values), [authenticate]);
  const login = useCallback((values) => authenticate('/api/auth/login', values), [authenticate]);
  const loginWithGoogle = useCallback((credential) => authenticate('/api/auth/google', { credential }), [authenticate]);
  const logout = useCallback(async () => {
    await request('/api/auth/logout', {});
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    register,
    login,
    loginWithGoogle,
    logout,
  }), [user, loading, register, login, loginWithGoogle, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
