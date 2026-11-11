import useScrolled from '../../hooks/useScrolled.js';

export default function BackToTop() {
  const show = useScrolled(600);
  return (
    <button className={`top2${show ? ' on' : ''}`} aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
  );
}
