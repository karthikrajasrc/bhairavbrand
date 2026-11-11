import { useEffect, useState } from 'react';
import { announcements } from '../../data/content.js';

export default function AnnouncementBar() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % announcements.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ann" aria-live="polite">
      {announcements.map((text, n) => <p key={text} className={n === i ? 'on' : ''}>{text}</p>)}
    </div>
  );
}
