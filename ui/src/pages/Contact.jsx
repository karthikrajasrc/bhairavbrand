import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader.jsx';
import { apiRequest } from '../context/AuthContext.jsx';

const initialForm = { name: '', email: '', phone: '', subject: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await apiRequest('/api/contact', { method: 'POST', body: form });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Contact Us" />
      <section className="support-page">
        <div className="support-intro">
          <p className="admin-eyebrow">We’re here to help</p>
          <h2>How can we help you?</h2>
          <p>Send us a message and our team will get back to you.</p>
        </div>
        <div className="support-contact-details" aria-label="Contact details">
          <div>
            <h3>Call us</h3>
            <a href="tel:+917871780414">+91 78717 80414</a>
          </div>
          <div>
            <h3>Our location</h3>
            <address>Madurai, Tamil Nadu</address>
          </div>
        </div>
        {submitted ? (
          <div className="support-panel support-success" role="status">
            <span className="checkout-confirmation-mark" aria-hidden="true">✓</span>
            <h2>Thanks for reaching out</h2>
            <p>Your message has been received. We’ll be in touch soon.</p>
            <button className="btn o" onClick={() => { setSubmitted(false); setForm(initialForm); }} type="button">
              Send another message
            </button>
          </div>
        ) : (
          <form className="support-panel support-form" onSubmit={submit}>
            <label className="checkout-field">
              Your name
              <input autoComplete="name" maxLength="80" minLength="2" required
                value={form.name} onChange={(event) => setField('name', event.target.value)} />
            </label>
            <label className="checkout-field">
              Email
              <input autoComplete="email" maxLength="254" required type="email"
                value={form.email} onChange={(event) => setField('email', event.target.value)} />
            </label>
            <label className="checkout-field">
              Phone (optional)
              <input autoComplete="tel" maxLength="18" pattern="[0-9+ ()-]{10,18}"
                placeholder="10-digit mobile number" type="tel"
                value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
            </label>
            <label className="checkout-field">
              Subject
              <input maxLength="120" minLength="2" required
                value={form.subject} onChange={(event) => setField('subject', event.target.value)} />
            </label>
            <label className="checkout-field checkout-field-wide">
              Message
              <textarea maxLength="3000" minLength="10" required rows="6"
                value={form.message} onChange={(event) => setField('message', event.target.value)} />
            </label>
            {error && <p className="checkout-error" role="alert">{error}</p>}
            <button className="btn support-submit" disabled={submitting} type="submit">
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
