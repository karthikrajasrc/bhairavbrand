import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const initialReview = { name: '', stars: '5', comments: '' };

export default function AdminReviews() {
  const { notify } = useCart();
  const [reviews, setReviews] = useState([]);
  const [review, setReview] = useState(initialReview);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      const result = await apiRequest('/api/admin/reviews');
      setReviews(result.reviews);
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await apiRequest('/api/admin/reviews', {
        method: 'POST',
        body: { ...review, stars: Number(review.stars) },
      });
      setReviews((current) => [result.review, ...current]);
      setReview(initialReview);
      notify('Review added.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeReview = async (item) => {
    setBusyId(item._id);
    try {
      await apiRequest(`/api/admin/reviews/${item._id}`, { method: 'DELETE' });
      setReviews((current) => current.filter((entry) => entry._id !== item._id));
      notify('Review removed.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <div className="admin-page-title">
        <div><p className="admin-eyebrow">Storefront</p><h2>Reviews</h2></div>
        <span className="admin-product-count">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
      </div>
      <form className="admin-panel admin-form admin-review-form" onSubmit={submit}>
        <h3 className="admin-wide">Add review</h3>
        <label>Name
          <input autoComplete="name" maxLength="80" minLength="2" required
            value={review.name}
            onChange={(event) => setReview((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>Stars
          <select required value={review.stars}
            onChange={(event) => setReview((current) => ({ ...current, stars: event.target.value }))}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>{stars} {stars === 1 ? 'star' : 'stars'}</option>
            ))}
          </select>
        </label>
        <label className="admin-wide">Comments
          <textarea maxLength="1200" minLength="3" required rows="5"
            value={review.comments}
            onChange={(event) => setReview((current) => ({ ...current, comments: event.target.value }))} />
        </label>
        <div className="admin-form-actions admin-wide">
          <button className="btn" disabled={saving} type="submit">
            {saving ? 'Saving…' : 'Add review'}
          </button>
        </div>
      </form>
      <section className="admin-panel admin-record-list" aria-label="Existing reviews">
        <h3>Existing reviews</h3>
        {loading ? <p role="status">Loading reviews…</p>
          : reviews.length === 0 ? <p>No reviews yet. Add one above to display it on the storefront.</p>
            : reviews.map((item) => (
              <article className="admin-product-row admin-review-row" key={item._id}>
                <div className="admin-record-copy">
                  <b>{item.name}</b>
                  <span className="admin-review-stars" role="img" aria-label={`${item.stars} out of 5 stars`}>
                    {'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}
                  </span>
                  <small>{item.comments}</small>
                </div>
                <button className="admin-remove" disabled={busyId === item._id}
                  onClick={() => removeReview(item)} type="button">
                  {busyId === item._id ? 'Removing…' : 'Remove'}
                </button>
              </article>
            ))}
      </section>
    </>
  );
}
