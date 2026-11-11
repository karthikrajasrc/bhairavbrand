import { useEffect, useRef, useState } from 'react';

// Fades/slides a block in once, the first time it scrolls into view.
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches || !('IntersectionObserver' in window)) {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <Tag ref={ref} className={`${className} rev${seen ? ' in' : ''}`.trim()} {...rest}>{children}</Tag>;
}
