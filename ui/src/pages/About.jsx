import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader.jsx';
import Reveal from '../components/ui/Reveal.jsx';

const collections = [
  { title: 'Agarbathi', description: 'Bring a pleasant fragrance and peaceful atmosphere to your prayer space.' },
  { title: 'Sambrani', description: 'Traditional fragrance for your daily pooja rituals.' },
  { title: 'Oodhupathi', description: 'Experience the beauty of traditional devotional fragrance.' },
  { title: 'Sambrani Cups', description: 'Convenient devotional fragrance solutions.' },
  { title: 'Pooja Idols', description: 'Add a divine touch to your home and prayer room.' },
  { title: 'Devotional Accessories', description: 'Essential products for your everyday spiritual needs.' },
];

const wholesaleBenefits = [
  'Attractive bulk purchasing options',
  'Wide range of devotional products',
  'Multiple product categories',
  'Business-friendly ordering support',
  'Opportunities for long-term business partnerships',
];

const reasons = [
  'A dedicated range of devotional essentials',
  'Wholesale and retail purchasing options',
  'Multiple product categories under one brand',
  'Customer-focused service',
  'Commitment to building lasting business relationships',
];

export default function About() {
  return (
    <>
      <PageHeader title="About Bhairav Brand" />
      <section className="sec about-page">
        <div className="w">
          <Reveal className="about-intro">
            <div className="about-intro-copy">
              <p className="about-eyebrow">From Code to Devotion</p>
              <h2>Bringing Tradition to Every Home</h2>
              <p>
                At <strong>Bhairav Brand</strong>, we believe that devotion begins with the little things
                that make every prayer special.
              </p>
              <p>
                We are dedicated to offering quality devotional essentials that bring fragrance,
                positivity and a spiritual atmosphere into every home. Our collection includes carefully
                selected Agarbathi, Sambrani, Oodhupathi, Sambrani Cups, Pooja Idols and other devotional
                accessories.
              </p>
              <p>
                Whether it is your daily prayer, a special pooja or a festive celebration, Bhairav Brand
                aims to make every devotional moment more meaningful.
              </p>
            </div>
            <div className="about-brand-card">
              <img src="/assets/logo.png" alt="Bhairav Brand logo" width="156" height="156" />
              <p>For every prayer. For every home. For every business.</p>
            </div>
          </Reveal>

          <Reveal className="about-section">
            <div className="about-section-heading">
              <p className="about-eyebrow">Our Business</p>
              <h2>Wholesale &amp; Retail</h2>
              <p>Bhairav Brand serves individual customers and business partners with devotional products.</p>
            </div>
            <div className="about-business-grid">
              <article className="about-card">
                <p className="about-eyebrow">For your home</p>
                <h3>Retail Sales</h3>
                <p>
                  Looking for quality pooja essentials for your home? Explore our devotional collections
                  and find the products you need for daily worship, festivals and special occasions. We aim
                  to provide a convenient shopping experience with quality products and great value.
                </p>
              </article>
              <article className="about-card">
                <p className="about-eyebrow">For your business</p>
                <h3>Wholesale Business</h3>
                <p>
                  Are you a retailer, distributor, reseller or pooja store owner? Bhairav Brand welcomes
                  wholesale enquiries and business partnerships, with product collections suitable for
                  retail stores and bulk purchasing.
                </p>
                <h4>Wholesale Benefits</h4>
                <ul className="about-list">
                  {wholesaleBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
                </ul>
                <p className="about-contact-note">
                  Contact our team for wholesale pricing, minimum order quantities and bulk order details.
                </p>
              </article>
            </div>
          </Reveal>

          <Reveal className="about-section">
            <div className="about-section-heading">
              <p className="about-eyebrow">What we offer</p>
              <h2>Our Product Collections</h2>
            </div>
            <div className="about-collections-grid">
              {collections.map(({ title, description }) => (
                <article className="about-collection-card" key={title}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal className="about-mission-grid">
            <article className="about-card">
              <p className="about-eyebrow">Our Mission</p>
              <h2>Devotional essentials for every household</h2>
              <p>
                Our mission is to make devotional essentials accessible to every household while building
                strong and trustworthy relationships with customers, retailers and wholesale partners.
              </p>
            </article>
            <article className="about-card">
              <p className="about-eyebrow">Our Vision</p>
              <h2>A trusted devotional products brand</h2>
              <p>
                To grow as a trusted devotional products brand, bringing traditional values and quality
                devotional essentials to homes and businesses across India.
              </p>
            </article>
          </Reveal>

          <Reveal className="about-section">
            <div className="about-section-heading">
              <p className="about-eyebrow">Why Choose Bhairav Brand?</p>
              <h2>Tradition, quality and service</h2>
            </div>
            <ul className="about-reasons-grid">
              {reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </Reveal>

          <Reveal className="about-cta">
            <div>
              <p className="about-eyebrow">Let’s Grow Together!</p>
              <h2>For Every Prayer. For Every Home. For Every Business.</h2>
              <p>Whether you are purchasing for your home or looking to expand your business, Bhairav Brand welcomes you.</p>
              <strong>Bhairav Brand – From Code to Devotion.</strong>
            </div>
            <div className="about-cta-actions">
              <Link className="btn" to="/collections/all">Explore Our Products</Link>
              <Link className="btn o" to="/contact">Contact Us for Wholesale Enquiries</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
