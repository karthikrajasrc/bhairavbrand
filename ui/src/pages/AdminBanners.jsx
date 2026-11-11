import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function AdminBanners() {
  const { notify } = useCart();
  const [banners, setBanners] = useState([]);
  const [busyId, setBusyId] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.notice) {
      notify(location.state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, notify]);

  const loadBanners = useCallback(async () => {
    try {
      const result = await apiRequest('/api/admin/banners');
      setBanners(result.banners);
    } catch (requestError) {
      notify(requestError.message, 'error');
    }
  }, [notify]);

  useEffect(() => { loadBanners(); }, [loadBanners]);

  const removeBanner = async (banner) => {
    setBusyId(banner._id);
    try {
      await apiRequest(`/api/admin/banners/${banner._id}`, { method: 'DELETE' });
      setBanners((current) => current.filter((item) => item._id !== banner._id));
      notify('Banner removed.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <div className="admin-page-title">
        <div><p className="admin-eyebrow">Storefront</p><h2>Banner images</h2></div>
        <Link className="btn" to="/admin/banners/new">Add banner</Link>
      </div>
      <section className="admin-panel admin-banner-list">
        {banners.length === 0 ? <p>No banners yet. Add a banner to feature it on your storefront.</p> : (
          banners.map((banner) => (
            <article className="admin-banner-card" key={banner._id}>
              <img alt="" src={banner.imageUrl} />
              <div className="admin-record-copy"><b>{banner.title}</b></div>
              <button className="admin-remove" disabled={busyId === banner._id}
                onClick={() => removeBanner(banner)} type="button">
                {busyId === banner._id ? 'Removing…' : 'Remove'}
              </button>
            </article>
          ))
        )}
      </section>
    </>
  );
}
