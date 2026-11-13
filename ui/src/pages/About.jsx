import PageHeader from '../components/ui/PageHeader.jsx';
import Reveal from '../components/ui/Reveal.jsx';
import Process from '../components/home/Process.jsx';
import TrustStrip from '../components/home/TrustStrip.jsx';
import CtaBanner from '../components/home/CtaBanner.jsx';
import { aboutText } from '../data/content.js';

export default function About() {
  return (
    <>
      <PageHeader title="Our Story" crumbs={[{ label: 'About Us' }]} />
      <section className="sec">
        <Reveal className="w story rev-stagger">
          <div>
            <h2 style={{ fontSize: 'clamp(26px,3.4vw,40px)', marginBottom: 16 }}>Rooted in tradition, grown for your family</h2>
            {aboutText.map((t) => <p key={t}>{t}</p>)}
          </div>
          <img src="/assets/logo.png" alt="Bhairav Brand logo" width="156" height="156" />
        </Reveal>
      </section>
      <Process />
      <TrustStrip />
      <CtaBanner />
    </>
  );
}
