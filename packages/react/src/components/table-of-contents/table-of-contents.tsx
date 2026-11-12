'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { TextAlignLeftIcon } from '@radix-ui/react-icons';
import { useActiveHeading, useHeadingsInView } from './use-active-heading.js';
import s from './table-of-contents.module.css';

export interface TocItem {
  /** The heading element's id; the link is a plain in-page anchor to it. */
  id: string;
  title: ReactNode;
  items?: readonly TocItem[];
}

export interface TableOfContentsProps extends Omit<ComponentProps<'nav'>, 'children'> {
  items: readonly TocItem[];
  /**
   * `list`: titles on a hairline rail. `track`: every level shown, on a line that steps in with
   * each level and darkens for the sections on screen. `ticks`: a slim rail of marks for long
   * reads, which opens into the titles on hover, focus or a press.
   */
  variant?: 'list' | 'track' | 'ticks';
  /** Names the landmark and heads the rail. */
  label?: string;
  /** Prints "01", "02", … before each top-level title, like drawing callouts. List only. */
  numbered?: boolean;
  /** Prints "3 / 7" for the section being read. List only. */
  showReading?: boolean;
  /** A Show/Hide toggle: on small screens only, never, or always. List and track. */
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

interface FlatItem {
  item: TocItem;
  depth: number;
}

const pad = (index: number) => String(index + 1).padStart(2, '0');
/** Horizontal step of the track per level, in pixels. */
const STEP = 12;
/** Height of the slant where the track changes level, at the top of the row that changes. */
const SLANT = 8;
/** The line's centre at depth 0: its 1.5px stroke then starts on a whole pixel. */
const EDGE = 0.75;

interface TrackRow {
  top: number;
  bottom: number;
  x: number;
}

/**
 * The line through rows `from` to `to`. A change of level slants across the top of the row
 * that changes, so each row owns a whole piece of the line and a lit stretch starts and ends
 * on a vertical run, never half way along a slant.
 */
export function trackPath(rows: readonly TrackRow[], from: number, to: number): string {
  const first = rows[from]!;
  const stepped = from > 0 && rows[from - 1]!.x !== first.x;
  let path = `M ${first.x} ${first.top + (stepped ? SLANT : 0)}`;
  for (let index = from; index <= to; index += 1) {
    const row = rows[index]!;
    const previous = rows[index - 1];
    if (index > from && previous && previous.x !== row.x)
      path += ` L ${previous.x} ${row.top} L ${row.x} ${row.top + SLANT}`;
    path += ` L ${row.x} ${row.bottom}`;
  }
  return path;
}

function flatten(items: readonly TocItem[], depth = 0): FlatItem[] {
  return items.flatMap((item) => [{ item, depth }, ...flatten(item.items ?? [], depth + 1)]);
}

/**
 * An "On this page" rail that marks the section being read. Links are plain in-page anchors;
 * nothing hijacks scrolling. In the list, sections before the active one are marked read and
 * only the active section's sub-items are shown.
 */
export function TableOfContents({
  items,
  variant = 'list',
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
  const flat = flatten(items);
  const ids = flat.map(({ item }) => item.id);
  const tracked = useActiveHeading(ids, { readingLine });
  const visible = useHeadingsInView(ids, variant === 'track' && activeId === undefined);
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
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const activeIndex = flat.findIndex(({ item }) => item.id === active);

  if (variant === 'ticks')
    return (
      <nav
        {...props}
        aria-labelledby={labelId}
        data-part="table-of-contents"
        data-variant="ticks"
        data-open={open || undefined}
        className={`${s.root} ${s.ticksRoot} ${className}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            setOpen(false);
            event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus();
          }
        }}
      >
        <Heading id={labelId} className={s.srOnly}>
          {label}
        </Heading>
        <button
          type="button"
          className={s.rail}
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          onClick={() => setOpen((current) => !current)}
        >
          {flat.map(({ item, depth }, index) => {
            const distance = activeIndex < 0 ? Infinity : Math.abs(index - activeIndex);
            return (
              <span
                key={item.id}
                className={s.tick}
                data-depth={Math.min(depth, 2)}
                data-near={distance === 0 ? 'current' : distance === 1 ? 'next' : undefined}
                data-read={activeIndex >= 0 && index < activeIndex ? '' : undefined}
              />
            );
          })}
        </button>
        <ol id={listId} className={s.panel}>
          {flat.map(({ item, depth }) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={s.panelLink}
                style={{ '--toc-depth': depth } as CSSProperties}
                aria-current={active === item.id ? 'location' : undefined}
                onClick={() => setOpen(false)}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    );

  const head = (
    <div className={s.head}>
      <Heading id={labelId} className={variant === 'track' ? s.trackTitle : s.title}>
        {variant === 'track' && <TextAlignLeftIcon aria-hidden="true" width={15} height={15} />}
        {label}
      </Heading>
      {showReading && variant === 'list' && (
        <span className={s.reading} aria-hidden="true">
          {activeTop(items, active) >= 0
            ? `${activeTop(items, active) + 1} / ${items.length}`
            : `${items.length} sections`}
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
  );

  if (variant === 'track') {
    const lit = activeId === undefined ? visible : active ? [active] : [];
    return (
      <nav
        {...props}
        aria-labelledby={labelId}
        data-part="table-of-contents"
        data-variant="track"
        data-collapsible={collapsible}
        data-open={open || undefined}
        className={`${s.root} ${className}`}
      >
        {head}
        <Track id={listId} flat={flat} lit={lit} active={active} />
      </nav>
    );
  }

  const top = activeTop(items, active);
  return (
    <nav
      {...props}
      aria-labelledby={labelId}
      data-part="table-of-contents"
      data-collapsible={collapsible}
      data-open={open || undefined}
      className={`${s.root} ${className}`}
    >
      {head}
      <ol id={listId} className={s.list}>
        {items.map((item, index) => {
          const state = index === top ? 'current' : top >= 0 && index < top ? 'read' : undefined;
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
              {item.items && item.items.length > 0 && index === top && (
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

function activeTop(items: readonly TocItem[], active: string | null): number {
  return items.findIndex(
    (item) => item.id === active || item.items?.some((sub) => sub.id === active),
  );
}

interface Geometry {
  width: number;
  height: number;
  rows: TrackRow[];
}

/** The track list, with an SVG line measured from the rendered rows. */
function Track({
  id,
  flat,
  lit,
  active,
}: {
  id: string;
  flat: readonly FlatItem[];
  lit: readonly string[];
  active: string | null;
}) {
  const list = useRef<HTMLOListElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const depths = flat.map(({ depth }) => depth).join(',');
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => {
      const links = [...element.querySelectorAll<HTMLElement>('[data-toc-row]')];
      if (links.length === 0) return;
      const rows = links.map((link) => {
        const depth = Number(link.dataset.tocRow);
        return {
          top: link.offsetTop,
          bottom: link.offsetTop + link.offsetHeight,
          x: EDGE + depth * STEP,
        };
      });
      setGeometry({
        width: Math.ceil(Math.max(...rows.map((row) => row.x)) + 2),
        height: element.offsetHeight,
        rows,
      });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [depths]);
  const litIndexes = flat
    .map(({ item }, index) => (lit.includes(item.id) ? index : -1))
    .filter((index) => index >= 0);
  // Rows are re-measured after a change of items; until then an index may be out of range.
  const count = geometry?.rows.length ?? 0;
  const from = litIndexes[0];
  const to = litIndexes.at(-1);
  const litRange =
    geometry && from !== undefined && to !== undefined && to < count ? { from, to } : undefined;
  const end = litRange && geometry ? geometry.rows[litRange.to]! : undefined;
  return (
    <div className={s.trackBody}>
      {geometry && (
        <svg
          className={s.trackLine}
          width={geometry.width}
          height={geometry.height}
          aria-hidden="true"
          focusable="false"
        >
          <path d={trackPath(geometry.rows, 0, count - 1)} className={s.trackBase} />
          {litRange && end && (
            <>
              <path
                d={trackPath(geometry.rows, litRange.from, litRange.to)}
                className={s.trackLit}
              />
              <circle cx={end.x} cy={end.bottom - 2} r="2.5" className={s.trackDot} />
            </>
          )}
        </svg>
      )}
      <ol id={id} ref={list} className={s.trackList} data-measured={geometry ? '' : undefined}>
        {flat.map(({ item, depth }) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={s.trackLink}
              data-toc-row={depth}
              data-lit={lit.includes(item.id) ? '' : undefined}
              style={{ '--toc-depth': depth } as CSSProperties}
              aria-current={active === item.id ? 'location' : undefined}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
