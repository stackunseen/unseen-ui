'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import s from './icon-hint.module.css';

/** Private, non-interactive hint. The button retains its own accessible name. */
export function IconHint({
  target,
  text,
  onDismiss,
  onPointerEnter,
  onPointerLeave,
}: {
  target: HTMLButtonElement;
  text: string;
  onDismiss: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const hint = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = hint.current;
    const view = target.ownerDocument.defaultView;
    if (!element || !view) return;
    const position = () => {
      const box = target.getBoundingClientRect();
      const viewport = view.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? view.innerWidth;
      const height = viewport?.height ?? view.innerHeight;
      const below = top + height - box.bottom - 16;
      const above = box.top - top - 16;
      element.style.maxWidth = `${Math.max(0, Math.min(280, width - 16))}px`;
      element.style.maxHeight = `${Math.max(0, Math.max(below, above))}px`;
      const bottom = below >= element.offsetHeight || below >= above;
      element.dataset.side = bottom ? 'bottom' : 'top';
      element.style.left = `${Math.max(left + 8, Math.min(box.left + (box.width - element.offsetWidth) / 2, left + width - element.offsetWidth - 8))}px`;
      element.style.top = `${bottom ? box.bottom + 8 : box.top - element.offsetHeight - 8}px`;
      element.style.visibility =
        box.height > 0 && (box.bottom <= top || box.top >= top + height) ? 'hidden' : 'visible';
    };
    const scroll = (event: Event) => {
      if (!hint.current?.contains(event.target as Node)) position();
    };
    position();
    // Keyboard focus can scroll the trigger after onFocus. Keep its hint anchored.
    target.ownerDocument.addEventListener('scroll', scroll, true);
    view.addEventListener('resize', position);
    view.visualViewport?.addEventListener('resize', position);
    view.visualViewport?.addEventListener('scroll', position);
    return () => {
      target.ownerDocument.removeEventListener('scroll', scroll, true);
      view.removeEventListener('resize', position);
      view.visualViewport?.removeEventListener('resize', position);
      view.visualViewport?.removeEventListener('scroll', position);
    };
  }, [target, text]);

  useEffect(() => {
    const document = target.ownerDocument;
    const escape = (event: KeyboardEvent) => {
      // Dismiss the hint without swallowing the host dialog/menu's Escape behavior.
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('keydown', escape, true);
    };
  }, [target, onDismiss]);

  return createPortal(
    <ThemeSurface>
      <div
        ref={hint}
        className={s.hint}
        role="tooltip"
        // The button supplies its name and any distinct description before focus.
        aria-hidden="true"
        data-part="icon-hint"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={(event) => event.preventDefault()}
      >
        {text}
      </div>
    </ThemeSurface>,
    target.ownerDocument.body,
  );
}
