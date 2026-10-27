'use client';
import { useEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/* global IntersectionObserver */

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** True once the element has been on screen; immediately when observation is unavailable. */
function useOnScreen<T extends Element>(once: boolean) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) setVisible(false);
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);
  return { ref, visible };
}

export interface MarketingRevealProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
  /** Milliseconds to wait after the element is on screen, for staggering a row. */
  delayMs?: number;
  /** Reveal again each time it scrolls into view. Once by default. */
  repeat?: boolean;
}

/**
 * Fades and lifts its content into place the first time it scrolls into view. Content is in the
 * HTML and readable from the start; only the transition is added. Under reduced motion, or
 * without IntersectionObserver, it shows at once.
 */
export function MarketingReveal({
  children,
  delayMs = 0,
  repeat = false,
  className = '',
  style,
  ...props
}: MarketingRevealProps) {
  const { ref, visible } = useOnScreen<HTMLDivElement>(!repeat);
  return (
    <div
      {...props}
      ref={ref}
      className={`uim-reveal ${className}`}
      data-visible={visible || undefined}
      style={{ ...style, transitionDelay: delayMs ? `${delayMs}ms` : undefined }}
    >
      {children}
    </div>
  );
}

export interface MarketingNumberProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** The figure the host supplies; the component never computes it. */
  value: number;
  /** Formats the figure, for example with a unit or thousands separators. */
  format?: (value: number) => string;
  durationMs?: number;
}

/**
 * Counts up to a figure the first time it scrolls into view. The final, formatted value is in
 * the HTML and announced; the counting is decorative and skipped under reduced motion.
 */
export function MarketingNumber({
  value,
  format = (count) => count.toLocaleString(),
  durationMs = 1200,
  className = '',
  ...props
}: MarketingNumberProps) {
  const { ref, visible } = useOnScreen<HTMLSpanElement>(true);
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!visible) return;
    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, value, durationMs]);
  const settled = shown === null || shown === value;
  return (
    <span {...props} ref={ref} className={`uim-number ${className}`} data-part="marketing-number">
      {settled ? (
        format(value)
      ) : (
        <>
          <span aria-hidden="true">{format(shown)}</span>
          <span className="uim-sr-only">{format(value)}</span>
        </>
      )}
    </span>
  );
}
