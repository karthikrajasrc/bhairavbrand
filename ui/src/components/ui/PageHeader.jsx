import { Link } from 'react-router-dom';
import Reveal from './Reveal.jsx';

export default function PageHeader({ title, crumbs = [] }) {
  return (
    <Reveal as="div" className="ph">
      <div className="w">
        <h1>{title}</h1>
        <nav aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {crumbs.map((c) => <span key={c.label}> / {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}</span>)}
        </nav>
      </div>
    </Reveal>
  );
}
