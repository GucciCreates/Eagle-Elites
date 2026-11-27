'use client';

import { useEffect, useRef, useState } from 'react';

/** Eases a number to its new value (e.g. a fare). Instant with reduced motion. */
export function useCountUp(target: number, duration = 450) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    // Reduced motion: jump straight to the value on the next frame.
    const span = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = span ? Math.min(1, (now - began) / span) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(start + (target - start) * eased);
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = target;
    };
  }, [target, duration]);

  return value;
}
