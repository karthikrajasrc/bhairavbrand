import { Link } from 'react-router-dom';
import Reveal from '../components/ui/Reveal.jsx';

export default function NotFound() {
  return (
    <Reveal as="section" className="nf w rev-stagger">
      <h1>404</h1>
      <p style={{ color: 'var(--mut)', margin: '8px 0 24px' }}>We couldn’t find that page. Try the shop instead.</p>
      <Link className="btn" to="/collections/all">Browse all products</Link>
    </Reveal>
  );
}
