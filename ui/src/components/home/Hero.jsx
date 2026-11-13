import { useEffect, useRef, useState } from 'react';
import Reveal from '../ui/Reveal.jsx';

const mainBanner = {
  _id: 'bhairav-brand-main-banner',
  imageUrl: '/assets/desktop-banner-1.webp',
  mobileImageUrl: '/assets/mobile-banner-1.webp',
  title: 'Bhairav Brand — Premium Devotional Essentials',
};

const secondBanner = {
  _id: 'bhairav-brand-second-banner',
  imageUrl: '/assets/desktop-banner-2.webp',
  mobileImageUrl: '/assets/mobile-banner-2.webp',
  title: 'Bhairav Brand — Fragrance and Incense',
};

const thirdBanner = {
  _id: 'bhairav-brand-third-banner',
  imageUrl: '/assets/desktop-banner-3.webp',
  mobileImageUrl: '/assets/mobile-banner-3.webp',
  title: 'Bhairav Brand — Complete Devotional Essentials',
};

function BannerCarousel() {
  const displayBanners = [mainBanner, secondBanner, thirdBanner];
  const [activePage, setActivePage] = useState(0);
  const [activeMobileBanner, setActiveMobileBanner] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  const [mobileTransitionEnabled, setMobileTransitionEnabled] = useState(true);
  const mobileTrackRef = useRef(null);
  const touchStart = useRef(null);
  const swiped = useRef(false);
  const pages = Array.from({ length: Math.ceil(displayBanners.length / 3) }, (_, index) => (
    displayBanners.slice(index * 3, index * 3 + 3)
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
    if (!isMobile || displayBanners.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveMobileBanner((active) => Math.min(active + 1, displayBanners.length));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [displayBanners.length, isMobile]);

  const showPage = (index) => setActivePage((index + pages.length) % pages.length);
  const showMobileBanner = (index) => {
    setMobileTransitionEnabled(true);
    setActiveMobileBanner((index + displayBanners.length) % displayBanners.length);
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
    if (event.target !== mobileTrackRef.current || activeMobileBanner !== displayBanners.length) return;
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
                const image = (
                  <picture>
                    {banner.mobileImageUrl && <source media="(max-width: 720px)" srcSet={banner.mobileImageUrl} />}
                    <img src={banner.imageUrl} alt={banner.title} fetchPriority={pageIndex === 0 ? 'high' : 'auto'} />
                  </picture>
                );
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
            {displayBanners.map((banner, index) => (
              <div className="uploaded-banner-mobile-slide" key={banner._id}>
                <img
                  src={banner.mobileImageUrl || banner.imageUrl}
                  alt={banner.title}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                />
              </div>
            ))}
            {displayBanners.length > 1 && (
              <div className="uploaded-banner-mobile-slide" aria-hidden="true" key={`${displayBanners[0]._id}-mobile-clone`}>
                <img src={displayBanners[0].mobileImageUrl || displayBanners[0].imageUrl} alt="" loading="lazy" />
              </div>
            )}
          </div>
        </div>
        {displayBanners.length > 1 && (
          <div className="uploaded-banner-mobile-dots" aria-label="Choose a banner">
            {displayBanners.map((banner, index) => (
              <button type="button" key={banner._id}
                className={index === activeMobileBanner % displayBanners.length ? 'on' : ''}
                aria-label={`Show banner ${index + 1}`}
                aria-current={index === activeMobileBanner % displayBanners.length ? 'true' : undefined}
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
  return <BannerCarousel />;
}
