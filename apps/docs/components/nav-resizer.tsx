'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { navWidth, navWidthStorageKey as storageKey } from '../lib/nav-width';

const clamp = (value: number) => Math.round(Math.min(navWidth.max, Math.max(navWidth.min, value)));

function apply(width: number) {
  document.documentElement.style.setProperty('--docs-nav-width', `${width}px`);
}
function save(width: number) {
  try {
    if (width === navWidth.initial) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, String(width));
  } catch {
    // The width lasts for this visit.
  }
}

/**
 * The drag handle on the navigation's edge: drag it, or focus it and use the arrow keys (Shift for
 * bigger steps, Home and End for the limits). Double-click or Enter restores the default width.
 * It also keeps the current page's link in view inside the navigation's own scroll area.
 */
/** The pinned navigation only exists from 961px; below that the sites use their own mobile menus. */
const desktopQuery = '(min-width: 961px)';
function subscribeDesktop(change: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}

export function NavResizer(props: { navSelector: string; current?: string }) {
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
  // Nothing renders or runs on narrow screens, where the navigation is a menu instead.
  return desktop ? <Resizer {...props} /> : null;
}

function Resizer({ navSelector, current }: { navSelector: string; current?: string }) {
  const [width, setWidth] = useState<number>(navWidth.initial);
  const dragging = useRef(false);

  useEffect(() => {
    const value = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--docs-nav-width'),
    );
    if (Number.isFinite(value)) setWidth(clamp(value));
  }, []);

  // Bring the current link into view within the navigation, never by scrolling the page.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(navSelector);
    if (!nav) return;
    const frame = requestAnimationFrame(() => {
      const link = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!link) return;
      let scroller: HTMLElement | null = link.parentElement;
      while (scroller && scroller !== nav.parentElement) {
        const overflow = getComputedStyle(scroller).overflowY;
        if (
          (overflow === 'auto' || overflow === 'scroll') &&
          scroller.scrollHeight > scroller.clientHeight
        )
          break;
        scroller = scroller.parentElement;
      }
      if (!scroller || scroller === nav.parentElement) return;
      const box = scroller.getBoundingClientRect();
      const item = link.getBoundingClientRect();
      if (item.top < box.top + 24 || item.bottom > box.bottom - 24)
        scroller.scrollTop += item.top - box.top - box.height / 3;
    });
    return () => cancelAnimationFrame(frame);
  }, [navSelector, current]);

  const set = (next: number, persist = true) => {
    const value = clamp(next);
    setWidth(value);
    apply(value);
    if (persist) save(value);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.dataset.navResizing = '';
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    // The navigation starts at the left edge of the window, so the pointer's x is the new width.
    set(event.clientX, false);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    delete document.documentElement.dataset.navResizing;
    save(clamp(event.clientX));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? navWidth.step * 3 : navWidth.step;
    const next =
      event.key === 'ArrowLeft'
        ? width - step
        : event.key === 'ArrowRight'
          ? width + step
          : event.key === 'Home'
            ? navWidth.min
            : event.key === 'End'
              ? navWidth.max
              : event.key === 'Enter'
                ? navWidth.initial
                : null;
    if (next === null) return;
    event.preventDefault();
    set(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize navigation"
      aria-valuemin={navWidth.min}
      aria-valuemax={navWidth.max}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels wide`}
      title="Drag to resize. Double-click to reset."
      tabIndex={0}
      className="nav-resizer"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => set(navWidth.initial)}
      onKeyDown={onKeyDown}
    />
  );
}
