'use client';
import { useEffect, useState } from 'react';

export interface ActiveHeadingOptions {
  /** The reading line as a fraction of the viewport height. */
  readingLine?: number;
}

/**
 * The id of the last heading whose top has passed the reading line, or null before any has.
 * Tracks with an IntersectionObserver and a passive scroll listener, both cleaned up.
 */
export function useActiveHeading(
  ids: readonly string[],
  { readingLine = 0.33 }: ActiveHeadingOptions = {},
): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('\n');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const elements = key
      .split('\n')
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;
    const update = () => {
      const line = window.innerHeight * readingLine;
      let current: string | null = null;
      for (const element of elements)
        if (element.getBoundingClientRect().top <= line) current = element.id;
      setActive(current);
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(update, {
            rootMargin: `0px 0px -${Math.round((1 - readingLine) * 100)}% 0px`,
            threshold: [0, 1],
          });
    elements.forEach((element) => observer?.observe(element));
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [key, readingLine]);
  return active;
}
