'use client';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ComponentProps, ComponentType, KeyboardEvent, ReactNode, Ref } from 'react';
import { Button } from '../button/button.js';
import { CopyButton } from '../copy-button/copy-button.js';
import { MarkdownCodeBlock } from '../code-block/code-block.js';
import type { CodeBlockHandle, MarkdownCodeBlockProps } from '../code-block/code-block.js';
import { rovingTarget } from '../../shared/roving-focus.js';
import s from './code-tabs.module.css';

export interface CodeFile {
  /** The file name; files are keyed by it, so two files of one language are fine. */
  file: string;
  language: string;
  code: string;
  /** A short description shown under the file name. */
  label?: string;
}
export interface CodeTourStop {
  file: string;
  /** Line numbers start at 1 and the range is inclusive. */
  start: number;
  end: number;
  title: string;
  note: ReactNode;
}
export type CodeTabsCodeBlockProps = MarkdownCodeBlockProps & { ref?: Ref<CodeBlockHandle> };

export interface CodeTabsProps extends Omit<ComponentProps<'div'>, 'children'> {
  files: readonly CodeFile[];
  /** Names the file list. */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (file: string) => void;
  tour?: readonly CodeTourStop[];
  /** The open stop's index, or null for none. */
  stop?: number | null;
  defaultStop?: number | null;
  onStopChange?: (stop: number | null) => void;
  /** A hash prefix such as "tour-" for #tour-3 deep links, kept with history.replaceState. */
  hashLinks?: string | false;
  /** A CopyButton for the current file. */
  copy?: boolean;
  /** The code block to render; defaults to the plain block. Pass HighlightedCodeBlock for tokens. */
  codeBlock?: ComponentType<CodeTabsCodeBlockProps>;
  /** Below this width the file list runs across the top. */
  narrowBreakpoint?: number;
}

function useNarrow(breakpoint: number) {
  const query = `(max-width: ${breakpoint}px)`;
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
    () => false,
  );
}

/**
 * A code viewer for the files of one example: files listed beside the code, with optional
 * numbered tour stops that select a file, mark a line range and scroll it into view inside
 * the code pane. The host may own the file and the stop; #tour-n links open their stop.
 */
export function CodeTabs({
  files,
  label,
  value,
  defaultValue,
  onValueChange,
  tour = [],
  stop,
  defaultStop = null,
  onStopChange,
  hashLinks = false,
  copy = false,
  codeBlock: CodeBlock = MarkdownCodeBlock,
  narrowBreakpoint = 760,
  className = '',
  ...props
}: CodeTabsProps) {
  const id = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? files[0]?.file ?? '');
  const file = value ?? internalValue;
  const setFile = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };
  const [internalStop, setInternalStop] = useState<number | null>(defaultStop);
  const current = stop === undefined ? internalStop : stop;
  const stopRef = useRef(current);
  stopRef.current = current;
  const go = (next: number | null, fromHash = false) => {
    if (stop === undefined) setInternalStop(next);
    onStopChange?.(next);
    if (next !== null) setFile(tour[next]!.file);
    if (hashLinks && !fromHash && typeof history !== 'undefined')
      history.replaceState(
        null,
        '',
        next === null ? `${location.pathname}${location.search}` : `#${hashLinks}${next + 1}`,
      );
  };
  const goRef = useRef(go);
  goRef.current = go;
  const tourLength = tour.length;
  useEffect(() => {
    if (!hashLinks || tourLength === 0) return;
    const open = () => {
      const match = new RegExp(`^#${hashLinks.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`).exec(
        location.hash,
      );
      const index = match ? Number(match[1]) - 1 : -1;
      if (index < 0 || index >= tourLength) return;
      if (index !== stopRef.current) goRef.current(index, true);
      // Nothing on the page carries the hash id, so bring the tour into view ourselves.
      tourBox.current?.scrollIntoView({ block: 'start' });
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [hashLinks, tourLength]);

  const narrow = useNarrow(narrowBreakpoint);
  const tabs = useRef<HTMLDivElement>(null);
  const tourBox = useRef<HTMLDivElement>(null);
  const block = useRef<CodeBlockHandle>(null);
  const active = tour[current ?? -1];
  const selected = files.find((entry) => entry.file === file) ?? files[0];
  const marked = useMemo(
    () =>
      active && selected && active.file === selected.file
        ? ([[active.start, active.end]] as const)
        : undefined,
    [active, selected],
  );
  // Re-scroll when the same stop is opened again or the file changes under it.
  const pane = useRef<HTMLDivElement>(null);
  // The pane scrolls the first marked line to its top; when the range still sits outside the
  // viewport (a stop near the end of a short file), the page moves just enough to show it.
  useEffect(() => {
    if (!marked) return;
    block.current?.scrollToLine(marked[0][0]);
    const lines = pane.current?.querySelectorAll<HTMLElement>('[data-highlighted]');
    const last = lines?.[lines.length - 1];
    const first = lines?.[0];
    if (!last || !first || typeof window === 'undefined') return;
    const bottom = last.getBoundingClientRect().bottom;
    const top = first.getBoundingClientRect().top;
    if (bottom > window.innerHeight || top < 0) last.scrollIntoView({ block: 'nearest' });
  }, [marked, current, selected?.file]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(tabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
    const target = rovingTarget(event, items, () => false);
    if (!target) return;
    target.focus();
    if (target.dataset.file) setFile(target.dataset.file);
  };

  const tourBar = tourLength > 0 && (
    <div ref={tourBox} className={s.tour} data-part="code-tour">
      <div className={s.tourHead}>
        <p className={s.kicker}>Code tour · {tourLength} stops</p>
        <ol className={s.stops} aria-label="Tour stops">
          {tour.map((entry, index) => (
            <li key={`${entry.file}:${entry.start}`}>
              <button
                type="button"
                className={s.stop}
                aria-current={current === index ? 'step' : undefined}
                aria-label={`Stop ${index + 1}: ${entry.title}`}
                onClick={() => go(current === index ? null : index)}
              >
                {index + 1}
              </button>
            </li>
          ))}
        </ol>
        <div className={s.tourNav}>
          {current === null ? (
            <Button size="sm" onClick={() => go(0)}>
              Start the tour
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => go(current - 1)}
                disabled={current === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => go(current + 1 < tourLength ? current + 1 : null)}
              >
                {current + 1 < tourLength ? 'Next' : 'End the tour'}
              </Button>
            </>
          )}
        </div>
      </div>
      <div role="status" aria-live="polite" aria-label="Tour stop" className={s.note}>
        {active && (
          <>
            <p className={s.where}>
              {active.file} · lines {active.start} to {active.end}
            </p>
            <p className={s.stopTitle}>{active.title}</p>
            <p className={s.text}>{active.note}</p>
          </>
        )}
      </div>
    </div>
  );

  if (!selected) return null;
  const code = (
    <CodeBlock
      key={selected.file}
      ref={block}
      code={selected.code}
      language={selected.language}
      variant="numbered"
      highlightLines={marked}
    />
  );
  const toolbar = copy && (
    <div className={s.toolbar}>
      <CopyButton value={selected.code} label={`Copy ${selected.file}`} variant="ghost" size="sm" />
    </div>
  );

  if (files.length === 1)
    return (
      <div {...props} className={`${s.root} ${className}`} data-part="code-tabs" data-copy={copy || undefined}>
        {tourBar}
        <figure ref={pane} className={s.figure}>
          <figcaption className={s.caption}>
            <span>{selected.file}</span>
            {toolbar}
          </figcaption>
          {code}
        </figure>
      </div>
    );

  return (
    <div {...props} className={`${s.root} ${className}`} data-part="code-tabs" data-copy={copy || undefined}>
      {tourBar}
      <div className={s.viewer} data-orientation={narrow ? 'horizontal' : 'vertical'}>
        <div
          ref={tabs}
          role="tablist"
          aria-label={label}
          aria-orientation={narrow ? 'horizontal' : 'vertical'}
          className={s.files}
          onKeyDown={onTabKeyDown}
        >
          {files.map((entry) => {
            const on = entry.file === selected.file;
            const stops = tour.filter((item) => item.file === entry.file).length;
            return (
              <button
                key={entry.file}
                type="button"
                role="tab"
                id={`${id}-tab-${entry.file}`}
                aria-selected={on}
                aria-controls={`${id}-panel`}
                tabIndex={on ? 0 : -1}
                data-file={entry.file}
                className={s.file}
                onClick={() => setFile(entry.file)}
              >
                <span className={s.fileName}>{entry.file}</span>
                {entry.label && <span className={s.fileLabel}>{entry.label}</span>}
                {stops > 0 && (
                  <span className={s.fileStops}>
                    {stops} tour {stops === 1 ? 'stop' : 'stops'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div
          ref={pane}
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${selected.file}`}
          className={s.pane}
        >
          {toolbar}
          {code}
        </div>
      </div>
    </div>
  );
}
