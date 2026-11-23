import { useEffect, useState } from 'react';

export interface CountUpNumberProps {
  readonly value: number;
  readonly suffix?: string;
  readonly durationMs?: number;
  readonly className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CountUpNumber({
  value,
  suffix = '',
  durationMs = 320,
  className,
}: CountUpNumberProps) {
  const [shown, setShown] = useState<number>(() => (prefersReducedMotion() ? value : 0));

  useEffect(() => {
    if (prefersReducedMotion() || value <= 0) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }

    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return (
    <span className={['tabular', className ?? ''].filter(Boolean).join(' ')}>
      {shown}
      {suffix}
    </span>
  );
}
