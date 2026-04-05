import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({ value, prefix = '', suffix = '', duration = 600, className = '' }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    prevRef.current = to;

    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * ease);
      setDisplay(current);
      if (progress < 1) frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = typeof display === 'number' ? display.toLocaleString() : display;
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}