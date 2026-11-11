import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import Reveal from '../ui/Reveal.jsx';

function UploadedBannerCarousel({ banners }) {
  const [activePage, setActivePage] = useState(0);
  const [activeMobileBanner, setActiveMobileBanner] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  const [mobileTransitionEnabled, setMobileTransitionEnabled] = useState(true);
  const mobileTrackRef = useRef(null);
  const touchStart = useRef(null);
  const swiped = useRef(false);
  const pages = Array.from({ length: Math.ceil(banners.length / 3) }, (_, index) => (
    banners.slice(index * 3, index * 3 + 3)
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 720px)');
    const updateLayout = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (pages.length < 2 || isMobile) return undefined;
    const timer = window.setInterval(() => {
      setActivePage((active) => (active + 1) % pages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isMobile, pages.length]);

  useEffect(() => {
    if (!isMobile || banners.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveMobileBanner((active) => Math.min(active + 1, banners.length));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [banners.length, isMobile]);

  const showPage = (index) => setActivePage((index + pages.length) % pages.length);
  const showMobileBanner = (index) => {
    setMobileTransitionEnabled(true);
    setActiveMobileBanner((index + banners.length) % banners.length);
  };
  const handleTouchStart = (event) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(distance) > 40) {
      swiped.current = true;
      if (event.target.closest('.uploaded-banner-mobile-carousel')) {
        showMobileBanner(activeMobileBanner + (distance < 0 ? 1 : -1));
      } else {
        showPage(activePage + (distance < 0 ? 1 : -1));
      }
      window.setTimeout(() => { swiped.current = false; }, 0);
    }
    touchStart.current = null;
  };
  const handleMobileTransitionEnd = (event) => {
    if (event.target !== mobileTrackRef.current || activeMobileBanner !== banners.length) return;
    setMobileTransitionEnabled(false);
    setActiveMobileBanner(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setMobileTransitionEnabled(true));
    });
  };

  return (
    <Reveal
      as="section"
      className="hero uploaded-banners"
      aria-label="Featured offers"
      aria-roledescription="carousel"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          if (isMobile) showMobileBanner(activeMobileBanner - 1);
          else showPage(activePage - 1);
        }
        if (event.key === 'ArrowRight') {
          if (isMobile) showMobileBanner(activeMobileBanner + 1);
          else showPage(activePage + 1);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClickCapture={(event) => {
        if (swiped.current) {
          event.preventDefault();
          event.stopPropagation();
          swiped.current = false;
        }
      }}
    >
      <div className="uploaded-banner-viewport">
        <div className="uploaded-banner-track" style={{ transform: `translateX(-${activePage * 100}%)` }}>
          {pages.map((page, pageIndex) => (
            <div
              className={`uploaded-banner-page banner-count-${page.length}`}
              key={page[0]._id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${pageIndex + 1} of ${pages.length}`}
              aria-hidden={pageIndex !== activePage}
            >
              {page.map((banner, index) => {
                const props = {
                  className: `uploaded-banner-slide${index === 0 ? ' uploaded-banner-main' : ' uploaded-banner-side'}`,
                };
                const image = <img src={banner.imageUrl} alt={banner.title} fetchpriority={pageIndex === 0 ? 'high' : 'auto'} />;
                return <div {...props} key={banner._id}>{image}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="uploaded-banner-mobile-carousel" aria-label="Featured banners">
        <div className="uploaded-banner-mobile-viewport">
          <div
            className={`uploaded-banner-mobile-track${mobileTransitionEnabled ? '' : ' without-transition'}`}
            ref={mobileTrackRef}
            style={{ transform: `translateX(-${activeMobileBanner * 100}%)` }}
            onTransitionEnd={handleMobileTransitionEnd}
          >
            {banners.map((banner) => (
              <div className="uploaded-banner-mobile-slide" key={banner._id}>
                <img src={banner.imageUrl} alt={banner.title} loading="lazy" />
              </div>
            ))}
            {banners.length > 1 && (
              <div className="uploaded-banner-mobile-slide" aria-hidden="true" key={`${banners[0]._id}-mobile-clone`}>
                <img src={banners[0].imageUrl} alt="" loading="lazy" />
              </div>
            )}
          </div>
        </div>
        {banners.length > 1 && (
          <div className="uploaded-banner-mobile-dots" aria-label="Choose a banner">
            {banners.map((banner, index) => (
              <button type="button" key={banner._id}
                className={index === activeMobileBanner % banners.length ? 'on' : ''}
                aria-label={`Show banner ${index + 1}`}
                aria-current={index === activeMobileBanner % banners.length ? 'true' : undefined}
                onClick={() => showMobileBanner(index)} />
            ))}
          </div>
        )}
      </div>
      {pages.length > 1 && (
        <>
          <button className="uploaded-banner-arrow previous" type="button" aria-label="Previous banner group"
            onClick={() => showPage(activePage - 1)}>‹</button>
          <button className="uploaded-banner-arrow next" type="button" aria-label="Next banner group"
            onClick={() => showPage(activePage + 1)}>›</button>
          <div className="uploaded-banner-dots" aria-label="Choose a banner group">
            {pages.map((page, index) => (
              <button type="button" key={page[0]._id} className={index === activePage ? 'on' : ''}
                aria-label={`Show banner group ${index + 1}`}
                aria-current={index === activePage ? 'true' : undefined}
                onClick={() => showPage(index)} />
            ))}
          </div>
        </>
      )}
    </Reveal>
  );
}

export default function Hero() {
  const [banners, setBanners] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const { notify } = useCart();

  useEffect(() => {
    let active = true;
    apiRequest('/api/storefront/banners')
      .then(({ banners: currentBanners }) => {
        if (active) setBanners(currentBanners);
      })
      .catch((error) => {
        if (active) notify(error.message, 'error');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, [notify]);

  if (!loaded) return <Reveal className="home-banner-loading" aria-hidden="true" />;
  return banners.length > 0 ? <UploadedBannerCarousel banners={banners} /> : null;
}
