import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import Collection from './pages/Collection.jsx';
import Product from './pages/Product.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import TrackOrder from './pages/TrackOrder.jsx';
import NotFound from './pages/NotFound.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Account from './pages/Account.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminProducts from './pages/AdminProducts.jsx';
import AdminAddProduct from './pages/AdminAddProduct.jsx';
import AdminCategories from './pages/AdminCategories.jsx';
import AdminDelivery from './pages/AdminDelivery.jsx';
import AdminOrders from './pages/AdminOrders.jsx';
import AdminReviews from './pages/AdminReviews.jsx';
import Checkout from './pages/Checkout.jsx';
import Cart from './pages/Cart.jsx';
import { useAuth } from './context/AuthContext.jsx';

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <main className="admin-page"><p>Checking admin access…</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="products" replace />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminAddProduct />} />
          <Route path="products/:id/edit" element={<AdminAddProduct />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="delivery" element={<AdminDelivery />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="collections/:slug" element={<Collection />} />
        <Route path="products/:id" element={<Product />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="track-order" element={<TrackOrder />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="account" element={<Account />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
