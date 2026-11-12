'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { type ComponentProps, useId } from 'react';
import type { CommandReceipt } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Input } from '../input/input.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { VariantProps } from '../../shared/variants.js';
import { formatTime } from '../runs/shared.js';
import s from '../../shared/styles/styles.module.css';
import own from './memory-panel.module.css';

export type MemoryScope = 'session' | 'project' | 'user';
export interface MemoryEntry {
  id: string;
  /** Public text only; the host decides what a memory may show. */
  text: string;
  scope: MemoryScope;
  /** Where the memory came from, so a person can judge it. */
  source: { kind: 'conversation' | 'host' | 'person'; label: string; at: string };
  pinned?: boolean;
  /** Set by the host when the memory was used in the current request. */
  usedInContext?: boolean;
}
export type MemoryAction = 'pin' | 'unpin' | 'forget';
export interface MemoryRequest {
  entryId: string;
  action: MemoryAction;
}
/** A receipt for one row. Naming the action lets the row say what was not done. */
export interface MemoryReceipt extends CommandReceipt {
  action?: MemoryAction;
}
/** Rows rendered at once; a longer list asks the person to filter. */
const MAX_SHOWN = 200;
export interface MemoryPanelProps extends VariantProps<'MemoryPanel'>, ComponentProps<'section'> {
  entries: readonly MemoryEntry[];
  /** Controlled filter text; the host or the panel's own state owns it. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Asks the host to pin, unpin or forget. Nothing changes until a receipt confirms it. */
  onRequest: (request: MemoryRequest) => void;
  /** Receipts for requests in flight or settled, keyed by entry id. */
  receipts?: Readonly<Record<string, MemoryReceipt>>;
  /**
   * `loading` while the host fetches memories; entries already passed stay on screen.
   * `unavailable` when the host cannot read or change memory: rows stay readable and their
   * actions are disabled.
   */
  status?: 'ready' | 'loading' | 'unavailable';
  /** A short host reason shown with `unavailable`. */
  error?: string;
  /** Shows a retry button with `unavailable`. */
  onRetry?: () => void;
  locale?: string;
  timeZone?: string;
  label?: string;
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<MemoryPanelLabels>;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}
export interface MemoryPanelLabels {
  count: (saved: number, used: number) => string;
  filter: string;
  filterPlaceholder: string;
  list: (shown: number) => string;
  scopeSession: string;
  scopeProject: string;
  scopeUser: string;
  sourceConversation: string;
  sourceHost: string;
  sourcePerson: string;
  usedNow: string;
  pinned: string;
  pin: string;
  unpin: string;
  forget: string;
  /** Names a row's controls; `memory` is the shortened memory text. */
  actions: (memory: string) => string;
  pending: string;
  /** What was not done; `action` is set when the receipt names it. */
  failed: (action?: MemoryAction) => string;
  unknown: string;
  noMatch: string;
  empty: string;
  loading: string;
  unavailable: string;
  retry: string;
  /** Shown when the list is longer than the panel renders at once. */
  more: (shown: number, total: number) => string;
}
const defaultLabels: MemoryPanelLabels = {
  count: (saved, used) => `${saved} saved${used > 0 ? `, ${used} used in this request` : ''}`,
  filter: 'Filter memories',
  filterPlaceholder: 'Filter memories…',
  list: (shown) => `${shown} memories`,
  scopeSession: 'This session',
  scopeProject: 'This project',
  scopeUser: 'Everywhere',
  sourceConversation: 'Learned in a conversation',
  sourceHost: 'Added by your app',
  sourcePerson: 'Written by a person',
  usedNow: 'Used just now',
  pinned: 'Pinned',
  pin: 'Pin',
  unpin: 'Unpin',
  forget: 'Forget',
  actions: (memory) => `Actions for memory: ${memory}`,
  pending: 'Waiting for confirmation',
  failed: (action) =>
    action === 'forget'
      ? 'Not forgotten'
      : action === 'pin'
        ? 'Not pinned'
        : action === 'unpin'
          ? 'Still pinned'
          : 'Not changed',
  unknown: 'Outcome unknown; check before asking again',
  noMatch: 'No memories match the filter.',
  empty: 'Nothing is remembered yet.',
  loading: 'Loading memories…',
  unavailable: 'Memory is not available right now.',
  retry: 'Try again',
  more: (shown, total) => `Showing ${shown} of ${total}. Filter to narrow the list.`,
};

/** A short name for a row's controls, so they are announced by the memory and not its id. */
const summary = (text: string) => {
  const line = text.trim().replace(/\s+/g, ' ');
  return line.length > 60 ? `${line.slice(0, 59).trimEnd()}…` : line;
};

/**
 * What the assistant remembers, with where each memory came from, how far it reaches and
 * whether it was used just now. Pin, unpin and forget are requests to the host; a row shows a
 * pending receipt rather than pretending the change already happened.
 */
export function MemoryPanel({
  variant = 'list',
  entries,
  query,
  onQueryChange,
  onRequest,
  receipts = {},
  status = 'ready',
  error,
  onRetry,
  locale: localeProp,
  timeZone,
  label = 'Memory',
  labels,
  className = '',
  ...rest
}: MemoryPanelProps) {
  const locale = useLocale(localeProp);
  const id = useId();
  const text = { ...defaultLabels, ...labels };
  const scopeLabels: Record<MemoryScope, string> = {
    session: text.scopeSession,
    project: text.scopeProject,
    user: text.scopeUser,
  };
  const sourceLabels: Record<MemoryEntry['source']['kind'], string> = {
    conversation: text.sourceConversation,
    host: text.sourceHost,
    person: text.sourcePerson,
  };
  const receiptText = (receipt: MemoryReceipt): string | undefined =>
    receipt.status === 'submitting'
      ? text.pending
      : receipt.status === 'failed'
        ? text.failed(receipt.action)
        : receipt.status === 'outcome-unknown'
          ? text.unknown
          : undefined;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matching = entries.filter((entry) => {
    const haystack =
      `${entry.text} ${scopeLabels[entry.scope]} ${entry.source.label}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const shown = matching.slice(0, MAX_SHOWN);
  const loading = status === 'loading';
  const unavailable = status === 'unavailable';
  const used = entries.filter((entry) => entry.usedInContext).length;
  return (
    <section
      {...rest}
      className={`${variant === 'compact' ? own.compact : own.panel} ${className}`}
      data-part="memory-panel"
      data-variant={variant}
      data-status={status}
      aria-labelledby={`${id}-title`}
      aria-busy={loading || undefined}
    >
      <div className={s.row}>
        <strong id={`${id}-title`}>{label}</strong>
        {(entries.length > 0 || status === 'ready') && (
          <span className={s.muted}>{text.count(entries.length, used)}</span>
        )}
      </div>
      {loading && (
        <p role="status" className={s.muted}>
          {text.loading}
        </p>
      )}
      {unavailable && (
        <div role="alert" className={own.unavailable}>
          <span>
            {text.unavailable}
            {error ? ` ${error}` : ''}
          </span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              {text.retry}
            </Button>
          )}
        </div>
      )}
      <label className={s.srOnly} htmlFor={`${id}-filter`}>
        {text.filter}
      </label>
      <Input
        id={`${id}-filter`}
        type="search"
        value={query}
        placeholder={text.filterPlaceholder}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {shown.length ? (
        <ul className={own.list} aria-label={text.list(shown.length)}>
          {shown.map((entry) => {
            const receipt = receipts[entry.id];
            const pending = receipt?.status === 'submitting' || unavailable;
            const note = receipt ? receiptText(receipt) : undefined;
            return (
              <li key={entry.id} className={own.entry} data-pinned={entry.pinned || undefined}>
                <p className={own.text}>{entry.text}</p>
                <div className={own.meta}>
                  <span className={s.badge}>{scopeLabels[entry.scope]}</span>
                  {entry.usedInContext && <StatusBadge state="succeeded" label={text.usedNow} />}
                  {entry.pinned && <span className={s.badge}>{text.pinned}</span>}
                  <span className={s.muted}>
                    {sourceLabels[entry.source.kind]}: {entry.source.label},{' '}
                    {formatTime(entry.source.at, locale, timeZone)}
                  </span>
                </div>
                <div
                  className={own.actions}
                  role="group"
                  aria-label={text.actions(summary(entry.text))}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      onRequest({ entryId: entry.id, action: entry.pinned ? 'unpin' : 'pin' })
                    }
                  >
                    {entry.pinned ? text.unpin : text.pin}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onRequest({ entryId: entry.id, action: 'forget' })}
                  >
                    {text.forget}
                  </Button>
                  {note && (
                    <span className={s.muted} role="status">
                      {note}
                      {receipt?.status === 'failed' && receipt.message
                        ? `: ${receipt.message}`
                        : ''}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        status === 'ready' && (
          <p className={s.muted}>{entries.length ? text.noMatch : text.empty}</p>
        )
      )}
      {matching.length > shown.length && (
        <p className={s.muted}>{text.more(shown.length, matching.length)}</p>
      )}
    </section>
  );
}
