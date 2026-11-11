import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import AdminImageField from '../components/admin/AdminImageField.jsx';
import { uploadImage } from '../lib/uploadImage.js';

export default function AdminAddBanner() {
  const [banner, setBanner] = useState({ title: '', imageUrl: '' });
  const { notify } = useCart();
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const navigate = useNavigate();
  const setField = (field, value) => setBanner((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (!imageFile) throw new Error('Choose a banner image to upload.');
      const imageUrl = await uploadImage(imageFile);
      await apiRequest('/api/admin/banners', { method: 'POST', body: { ...banner, imageUrl } });
      navigate('/admin/banners', { state: { notice: 'Banner added.' } });
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-page-title">
        <div><p className="admin-eyebrow">Storefront</p><h2>Add banner image</h2></div>
        <Link className="admin-back-link" to="/admin/banners">← All banners</Link>
      </div>
      <form className="admin-panel admin-form admin-banner-form" onSubmit={submit}>
        <label>Banner title
          <input maxLength="120" minLength="2" required value={banner.title}
            onChange={(event) => setField('title', event.target.value)} />
        </label>
        <AdminImageField file={imageFile} label="Banner image" onChange={setImageFile} required />
        <div className="admin-form-actions admin-wide">
          <button className="btn" disabled={saving} type="submit">{saving ? 'Saving…' : 'Add banner'}</button>
          <Link className="btn o" to="/admin/banners">Cancel</Link>
        </div>
      </form>
    </>
  );
}
