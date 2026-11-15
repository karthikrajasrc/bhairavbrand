import { useEffect, useRef, useState } from 'react';
import Reveal from '../ui/Reveal.jsx';
import { apiRequest } from '../../context/AuthContext.jsx';

export default function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReview, setActiveReview] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  const carouselRef = useRef(null);
  const pages = Array.from({ length: Math.ceil(reviews.length / 3) }, (_, index) => (
    reviews.slice(index * 3, index * 3 + 3)
  ));

  useEffect(() => {
    let active = true;
    apiRequest('/api/storefront/reviews')
      .then(({ reviews: receivedReviews }) => {
        if (!Array.isArray(receivedReviews)) throw new Error('The API returned invalid reviews.');
        if (active) setReviews(receivedReviews);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 720px)');
    const updateLayout = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (isMobile || pages.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActivePage((current) => (current + 1) % pages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isMobile, pages.length]);

  if (loading || (!error && reviews.length === 0)) return null;

  const renderReview = (review) => (
    <blockquote className="rv" key={review._id}>
      <div className="st" role="img" aria-label={`${review.stars} out of 5 stars`}>
        {'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}
      </div>
      <p>{review.comments}</p>
      <div className="who">
        <span className="av" aria-hidden="true">{Array.from(review.name)[0]}</span>
        <b>{review.name}</b>
      </div>
    </blockquote>
  );

  const handleReviewScroll = (event) => {
    const track = event.currentTarget;
    const trackLeft = track.getBoundingClientRect().left;
    const nearestReview = Array.from(track.children).reduce((nearest, card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      return distance < nearest.distance ? { index, distance } : nearest;
    }, { index: 0, distance: Number.POSITIVE_INFINITY });
    setActiveReview((current) => current === nearestReview.index ? current : nearestReview.index);
  };

  const showReview = (index) => {
    const track = carouselRef.current?.querySelector('.review-track');
    const card = track?.children[index];
    if (!track || !card) return;
    const distance = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollTo({ left: track.scrollLeft + distance, behavior: 'smooth' });
    setActiveReview(index);
  };

  const showPage = (index) => setActivePage((index + pages.length) % pages.length);

  return (
    <section className="sec" style={{ paddingTop: 0 }}>
      <div className="w">
        <Reveal className="cen"><h2>Loved by Thousands</h2></Reveal>
        {error ? <p className="reviews-error" role="alert">{error}</p> : (
          isMobile ? (
            <div className="review-carousel" ref={carouselRef}>
              <Reveal className="rg review-track rev-stagger" aria-label="Customer reviews"
                onScroll={handleReviewScroll}>
                {reviews.map(renderReview)}
              </Reveal>
              {reviews.length > 1 && (
                <div className="uploaded-banner-mobile-dots review-dots" role="group" aria-label="Choose a review">
                  {reviews.map((review, index) => (
                    <button type="button" key={review._id}
                      className={index === activeReview ? 'on' : ''}
                      aria-label={`Show review ${index + 1}`}
                      aria-current={index === activeReview ? 'true' : undefined}
                      onClick={() => showReview(index)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="review-desktop-carousel" aria-label="Customer reviews" aria-roledescription="carousel">
              <div className="review-desktop-track" style={{ transform: `translateX(-${activePage * 100}%)` }}>
                {pages.map((page, index) => (
                  <div className="review-page" key={page[0]._id} role="group"
                    aria-label={`${index + 1} of ${pages.length}`} aria-roledescription="slide"
                    aria-hidden={index !== activePage}>
                    {page.map(renderReview)}
                  </div>
                ))}
              </div>
              {pages.length > 1 && (
                <div className="review-page-dots" role="group" aria-label="Choose a group of reviews">
                  {pages.map((page, index) => (
                    <button type="button" key={page[0]._id}
                      className={index === activePage ? 'on' : ''}
                      aria-label={`Show reviews ${index * 3 + 1} to ${Math.min((index + 1) * 3, reviews.length)}`}
                      aria-current={index === activePage ? 'true' : undefined}
                      onClick={() => showPage(index)} />
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
}
