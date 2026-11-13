import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import MobileDrawer from './MobileDrawer.jsx';
import CartDrawer from './CartDrawer.jsx';
import BackToTop from '../ui/BackToTop.jsx';
import WhatsAppButton from '../ui/WhatsAppButton.jsx';

export default function Layout() {
  const [menu, setMenu] = useState(false);
  const [cart, setCart] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); setMenu(false); setCart(false); }, [pathname]);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') { setMenu(false); setCart(false); } };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);

  const close = () => { setMenu(false); setCart(false); };
  return (
    <>
      <AnnouncementBar />
      <Header onMenu={() => setMenu(true)} onCart={() => setCart(true)} />
      <main><Outlet /></main>
      <Footer />
      <div className={`ov${menu || cart ? ' on' : ''}`} onClick={close} />
      <MobileDrawer open={menu} onClose={close} />
      <CartDrawer open={cart} onClose={close} />
      <BackToTop />
      <WhatsAppButton />
    </>
  );
}
