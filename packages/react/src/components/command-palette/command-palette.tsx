'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, SVGProps } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { ThemeSurface } from '../../providers/theme/theme-provider.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { Anchor, useLinkComponent } from '../../shared/link.js';
import { markMatches } from './mark-matches.js';
import { registerCommandPalette } from './use-command-palette.js';
import s from './command-palette.module.css';

export interface CommandPaletteItem {
  id: string;
  label: string;
  /** Items with the same group sit under one heading, in order of first appearance. */
  group: string;
  href?: string;
  /** A short note at the end of the row, such as the page type. */
  hint?: string;
  /** For example an excerpt with marked matches from markMatches. */
  description?: ReactNode;
  keywords?: string[];
  disabledReason?: string;
}

export interface CommandPaletteProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Static entries, filtered locally: every word of the query must match the label, hint, group or keywords. */
  items?: readonly CommandPaletteItem[];
  /** Async results for the typed query. Older queries are aborted through the signal and never shown. */
  search?: (query: string, signal: AbortSignal) => Promise<readonly CommandPaletteItem[]>;
  debounceMs?: number;
  /** Called for every selection. Items with an href also follow the LinkProvider's link when one is set. */
  onSelect?: (item: CommandPaletteItem) => void;
  /** A key combination such as "mod+k" (mod is Ctrl or Command), or false for none. */
  shortcut?: string | false;
  /** The dialog's accessible name. */
  label?: string;
  placeholder?: string;
  emptyState?: ReactNode;
  /** Decorative key hints below the list; false hides them. */
  footerHints?: ReactNode | false;
  /** An item appended last while a query is typed, such as "Search everything for X". */
  trailingAction?: (query: string) => CommandPaletteItem | null;
  /** How many static items to keep while a query is typed. */
  staticLimit?: number;
  searchingLabel?: string;
  /** Marks matches in labels; defaults to whole-word markMatches. false leaves labels plain. */
  highlight?: ((text: string, query: string) => ReactNode) | false;
  cancelLabel?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const DEFAULT_HINTS = (
  <>
    <span>
      <kbd className={s.key}>↑</kbd> <kbd className={s.key}>↓</kbd> to move
    </span>
    <span>
      <kbd className={s.key}>Enter</kbd> to open
    </span>
    <span>
      <kbd className={s.key}>Esc</kbd> to close
    </span>
  </>
);

function SearchGlyph(props: Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" strokeLinecap="round" />
    </svg>
  );
}

interface Shortcut {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}
function parseShortcut(value: string | false | undefined): Shortcut | null {
  if (!value) return null;
  const parts = value
    .toLowerCase()
    .split('+')
    .map((part) => part.trim());
  const key = parts[parts.length - 1];
  if (!key) return null;
  const modifiers = parts.slice(0, -1);
  return {
    key,
    mod: modifiers.includes('mod'),
    shift: modifiers.includes('shift'),
    alt: modifiers.includes('alt'),
  };
}
function matchesShortcut(event: globalThis.KeyboardEvent, shortcut: Shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    (event.ctrlKey || event.metaKey) === shortcut.mod &&
    event.shiftKey === shortcut.shift &&
    event.altKey === shortcut.alt
  );
}

const words = (query: string) => query.trim().toLowerCase().split(/\s+/).filter(Boolean);

/**
 * A Ctrl/Cmd+K menu for jumping to places and searching. Static items filter locally; async
 * results arrive debounced and cancelled. The host navigates or acts in onSelect; with a
 * LinkProvider, items with an href are that router link, so Enter and clicks navigate client-side.
 */
export function CommandPalette({
  open,
  defaultOpen = false,
  onOpenChange,
  items = [],
  search,
  debounceMs = 140,
  onSelect,
  shortcut = 'mod+k',
  label = 'Search the site',
  placeholder = 'Search or jump to…',
  emptyState = 'No matches.',
  footerHints = DEFAULT_HINTS,
  trailingAction,
  staticLimit = 8,
  searchingLabel = 'Searching…',
  highlight = markMatches,
  cancelLabel = 'Cancel',
  className = '',
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const controlled = open !== undefined;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChangeRef.current?.(next);
    },
    [controlled],
  );
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const mark = highlight === false ? (text: string) => text : highlight;
  // cmdk keeps whatever row was selected when results land, which can leave the selection on
  // a trailing action below the fold. Until the user moves it, the first option is selected.
  const [active, setActive] = useState<string | undefined>(undefined);
  const moved = useRef(false);
  useEffect(() => {
    moved.current = false;
  }, [trimmed]);
  const inputRef = useRef<HTMLInputElement>(null);
  const observer = useRef<MutationObserver | null>(null);
  // cmdk reports the active option through aria-activedescendant only after its own
  // scheduled update, which can trail the first selection. Mirror the selected option's id
  // onto the input as soon as the list changes, so the combobox is always announced.
  const setListRef = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const sync = () => {
      const selected = node.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]');
      const input = inputRef.current;
      if (!input) return;
      if (selected?.id) input.setAttribute('aria-activedescendant', selected.id);
      else input.removeAttribute('aria-activedescendant');
    };
    sync();
    observer.current = new MutationObserver(sync);
    observer.current.observe(node, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-selected'],
    });
  }, []);
  const LinkComponent = useLinkComponent();

  // A fresh query each time it opens; the previous search is not shown again.
  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);
  // Radix returns focus to a Dialog.Trigger only. The palette opens from a shortcut or the
  // hook, so remember what was focused before the layout settles and go back there on close.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, [isOpen]);

  useEffect(
    () =>
      registerCommandPalette({
        open: () => setOpen(true),
        close: () => setOpen(false),
      }),
    [setOpen],
  );

  useEffect(() => {
    const parsed = parseShortcut(shortcut);
    if (!parsed) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!matchesShortcut(event, parsed)) return;
      event.preventDefault();
      setOpen(!isOpenRef.current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcut, setOpen]);

  // Async results carry the query they answer, so a slow older response is never shown.
  const searchRef = useRef(search);
  searchRef.current = search;
  const hasSearch = typeof search === 'function';
  const [found, setFound] = useState<{
    query: string;
    items: readonly CommandPaletteItem[];
  } | null>(null);
  useEffect(() => {
    if (!isOpen || !hasSearch || !trimmed) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      let results: readonly CommandPaletteItem[] = [];
      try {
        results = (await searchRef.current?.(trimmed, controller.signal)) ?? [];
      } catch {
        results = [];
      }
      if (!controller.signal.aborted) setFound({ query: trimmed, items: results });
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, hasSearch, trimmed, debounceMs]);
  const searching = hasSearch && trimmed !== '' && found?.query !== trimmed;
  const hits = useMemo(
    () => (found?.query === trimmed && trimmed !== '' ? found.items : []),
    [found, trimmed],
  );

  const options = useMemo(() => {
    const terms = words(trimmed);
    const matched =
      terms.length === 0
        ? items
        : items
            .filter((item) => {
              const haystack =
                `${item.label} ${item.hint ?? ''} ${item.group} ${item.keywords?.join(' ') ?? ''}`.toLowerCase();
              return terms.every((term) => haystack.includes(term));
            })
            .slice(0, staticLimit);
    const seen = new Set(matched.map((item) => item.id));
    const hrefs = new Set(matched.map((item) => item.href).filter(Boolean));
    const result = [...matched];
    for (const item of hits) {
      if (seen.has(item.id) || (item.href && hrefs.has(item.href))) continue;
      seen.add(item.id);
      result.push(item);
    }
    const trailing = trimmed && trailingAction ? trailingAction(trimmed) : null;
    if (trailing && !seen.has(trailing.id)) result.push(trailing);
    return result;
  }, [items, trimmed, staticLimit, hits, trailingAction]);

  useEffect(() => {
    if (!moved.current && options[0]) setActive(options[0].id);
  }, [options]);

  const groups = useMemo(() => {
    const out: { name: string; items: CommandPaletteItem[] }[] = [];
    for (const item of options) {
      const group = out.find((entry) => entry.name === item.group);
      if (group) group.items.push(item);
      else out.push({ name: item.group, items: [item] });
    }
    return out;
  }, [options]);

  const handleSelect = (item: CommandPaletteItem) => {
    onSelect?.(item);
    setOpen(false);
  };

  // Enter while composing does nothing. With a router link, Enter clicks the active option's
  // link so the router navigates; cmdk then reports the selection through onSelect.
  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key))
      moved.current = true;
    if (event.key !== 'Enter') return;
    if (event.nativeEvent.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!LinkComponent) return;
    const id = event.currentTarget.getAttribute('aria-activedescendant');
    const element = id ? document.getElementById(id) : null;
    if (element instanceof HTMLAnchorElement && element.getAttribute('href')) {
      event.preventDefault();
      event.stopPropagation();
      element.click();
    }
  };

  const announcement = searching
    ? searchingLabel
    : `${options.length} ${options.length === 1 ? 'result' : 'results'}`;

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Portal>
        <ThemeSurface>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content
            className={`${s.dialog} ${className}`}
            aria-describedby={undefined}
            data-part="command-palette"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (opener.current?.isConnected) opener.current.focus();
            }}
          >
            <Dialog.Title className={s.srOnly}>{label}</Dialog.Title>
            <Command
              label={label}
              shouldFilter={false}
              loop
              className={s.command}
              value={active ?? ''}
              onValueChange={setActive}
            >
              <div className={s.field}>
                <AIIcon name="search" fallbackIcon={SearchGlyph} className={s.fieldIcon} />
                <Command.Input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder={placeholder}
                  aria-label={label}
                  className={s.input}
                  onKeyDown={onInputKeyDown}
                />
                <kbd className={`${s.key} ${s.fieldKey}`} aria-hidden="true">
                  Esc
                </kbd>
                <Dialog.Close asChild>
                  <button type="button" className={s.cancel}>
                    {cancelLabel}
                  </button>
                </Dialog.Close>
              </div>
              <Command.List
                ref={setListRef}
                className={s.list}
                label="Results"
                onPointerMove={() => {
                  moved.current = true;
                }}
              >
                {searching && (
                  <Command.Loading>
                    <div className={s.note}>
                      <LoadingIndicator label={searchingLabel} size="small" />
                    </div>
                  </Command.Loading>
                )}
                {!searching && options.length === 0 && (
                  <Command.Empty className={s.note}>{emptyState}</Command.Empty>
                )}
                {groups.map((group) => (
                  <Command.Group key={group.name} heading={group.name} className={s.group}>
                    {group.items.map((item) => {
                      const reason = item.disabledReason;
                      const content = (
                        <>
                          <span className={s.itemRow}>
                            <span className={s.itemLabel}>{mark(item.label, trimmed)}</span>
                            {item.hint && <span className={s.itemHint}>{item.hint}</span>}
                          </span>
                          {(item.description || reason) && (
                            <span className={s.itemDescription}>{reason ?? item.description}</span>
                          )}
                        </>
                      );
                      const common = {
                        value: item.id,
                        disabled: !!reason,
                        className: s.item,
                        onSelect: () => handleSelect(item),
                      };
                      return LinkComponent && item.href && !reason ? (
                        <Command.Item key={item.id} {...common} asChild>
                          <Anchor href={item.href}>{content}</Anchor>
                        </Command.Item>
                      ) : (
                        <Command.Item key={item.id} {...common}>
                          {content}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
              <div role="status" aria-live="polite" className={s.srOnly}>
                {announcement}
              </div>
              {footerHints !== false && (
                <p className={s.footer} aria-hidden="true">
                  {footerHints}
                </p>
              )}
            </Command>
          </Dialog.Content>
        </ThemeSurface>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
