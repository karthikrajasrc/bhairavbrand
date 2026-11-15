import Reveal from './Reveal.jsx';

export default function PageHeader({ title }) {
  return (
    <Reveal as="div" className="ph">
      <div className="w">
        <h1>{title}</h1>
      </div>
    </Reveal>
  );
}
