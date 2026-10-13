'use client';
import { useEffect, useId, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { useActiveHeading } from './use-active-heading.js';
import s from './table-of-contents.module.css';

export interface TocItem {
  /** The heading element's id; the link is a plain in-page anchor to it. */
  id: string;
  title: ReactNode;
  items?: readonly TocItem[];
}

export interface TableOfContentsProps extends Omit<ComponentProps<'nav'>, 'children'> {
  items: readonly TocItem[];
  /** Names the landmark and heads the rail. */
  label?: string;
  /** Prints "01", "02", … before each top-level title, like drawing callouts. */
  numbered?: boolean;
  /** Prints "3 / 7" for the section being read. */
  showReading?: boolean;
  /** A Show/Hide toggle: on small screens only, never, or always. */
  collapsible?: 'narrow' | 'never' | 'always';
  /** The reading line as a fraction of the viewport height. */
  readingLine?: number;
  /** Below this many top-level items the rail renders nothing. */
  minItems?: number;
  /** Control the active heading instead of tracking scroll; null means none. */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  headingLevel?: 2 | 3 | 4;
}

const pad = (index: number) => String(index + 1).padStart(2, '0');

/**
 * An "On this page" rail that marks the section being read. Links are plain in-page anchors;
 * nothing hijacks scrolling. Sections before the active one are marked read and only the
 * active section's sub-items are shown.
 */
export function TableOfContents({
  items,
  label = 'On this page',
  numbered = false,
  showReading = false,
  collapsible = 'narrow',
  readingLine = 0.33,
  minItems = 2,
  activeId,
  onActiveChange,
  headingLevel = 2,
  className = '',
  ...props
}: TableOfContentsProps) {
  const ids = items.flatMap((item) => [item.id, ...(item.items?.map((sub) => sub.id) ?? [])]);
  const tracked = useActiveHeading(ids, { readingLine });
  const active = activeId === undefined ? tracked : activeId;
  useEffect(() => {
    onActiveChange?.(tracked);
    // Reports what the tracker found, even when the host controls the display.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracked]);
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const listId = useId();
  if (items.length < minItems) return null;
  const activeTop = items.findIndex(
    (item) => item.id === active || item.items?.some((sub) => sub.id === active),
  );
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return (
    <nav
      {...props}
      aria-labelledby={labelId}
      data-part="table-of-contents"
      data-collapsible={collapsible}
      data-open={open || undefined}
      className={`${s.root} ${className}`}
    >
      <div className={s.head}>
        <Heading id={labelId} className={s.title}>
          {label}
        </Heading>
        {showReading && (
          <span className={s.reading} aria-hidden="true">
            {activeTop >= 0 ? `${activeTop + 1} / ${items.length}` : `${items.length} sections`}
          </span>
        )}
        {collapsible !== 'never' && (
          <button
            type="button"
            className={s.toggle}
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <ol id={listId} className={s.list}>
        {items.map((item, index) => {
          const state =
            index === activeTop
              ? 'current'
              : activeTop >= 0 && index < activeTop
                ? 'read'
                : undefined;
          return (
            <li key={item.id} className={s.item} data-state={state}>
              <a
                href={`#${item.id}`}
                className={s.link}
                aria-current={active === item.id ? 'location' : undefined}
              >
                {numbered && (
                  <span className={s.number} aria-hidden="true">
                    {pad(index)}
                  </span>
                )}
                <span className={s.text}>{item.title}</span>
              </a>
              {item.items && item.items.length > 0 && index === activeTop && (
                <ol className={s.sub}>
                  {item.items.map((sub) => (
                    <li key={sub.id}>
                      <a
                        href={`#${sub.id}`}
                        className={s.subLink}
                        aria-current={active === sub.id ? 'location' : undefined}
                      >
                        {sub.title}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
