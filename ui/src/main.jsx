import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import AppErrorBoundary from './components/ui/AppErrorBoundary.jsx';
import Toast from './components/ui/Toast.jsx';
import './styles/global.css';

document.documentElement.classList.add('js');

const app = (
  <AppErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <CartProvider>
            <>
              <App />
              <Toast />
            </>
          </CartProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </AppErrorBoundary>
);
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider> : app}
  </React.StrictMode>
);
