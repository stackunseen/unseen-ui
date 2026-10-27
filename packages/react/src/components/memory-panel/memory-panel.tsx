'use client';
import { useId } from 'react';
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
export interface MemoryPanelProps extends VariantProps<'MemoryPanel'> {
  entries: readonly MemoryEntry[];
  /** Controlled filter text; the host or the panel's own state owns it. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Asks the host to pin, unpin or forget. Nothing changes until a receipt confirms it. */
  onRequest: (request: MemoryRequest) => void;
  /** Receipts for requests in flight or settled, keyed by entry id. */
  receipts?: Readonly<Record<string, CommandReceipt>>;
  locale?: string;
  timeZone?: string;
  label?: string;
}

const scopeLabels: Record<MemoryScope, string> = {
  session: 'This session',
  project: 'This project',
  user: 'Everywhere',
};
const sourceLabels: Record<MemoryEntry['source']['kind'], string> = {
  conversation: 'Learned in a conversation',
  host: 'Added by your app',
  person: 'Written by a person',
};
const receiptText: Record<CommandReceipt['status'], string | undefined> = {
  idle: undefined,
  submitting: 'Waiting for confirmation',
  acknowledged: undefined,
  failed: 'Not changed',
  'outcome-unknown': 'Outcome unknown; check before asking again',
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
  locale,
  timeZone,
  label = 'Memory',
}: MemoryPanelProps) {
  const id = useId();
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = entries.filter((entry) => {
    const haystack = `${entry.text} ${scopeLabels[entry.scope]} ${entry.source.label}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const used = entries.filter((entry) => entry.usedInContext).length;
  return (
    <section
      className={variant === 'compact' ? own.compact : own.panel}
      data-part="memory-panel"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <div className={s.row}>
        <strong id={`${id}-title`}>{label}</strong>
        <span className={s.muted}>
          {entries.length} saved{used > 0 ? `, ${used} used in this request` : ''}
        </span>
      </div>
      <label className={s.srOnly} htmlFor={`${id}-filter`}>
        Filter memories
      </label>
      <Input
        id={`${id}-filter`}
        type="search"
        value={query}
        placeholder="Filter memories…"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {shown.length ? (
        <ul className={own.list} aria-label={`${shown.length} memories`}>
          {shown.map((entry) => {
            const receipt = receipts[entry.id];
            const pending = receipt?.status === 'submitting';
            const note = receipt ? receiptText[receipt.status] : undefined;
            return (
              <li key={entry.id} className={own.entry} data-pinned={entry.pinned || undefined}>
                <p className={own.text}>{entry.text}</p>
                <div className={own.meta}>
                  <span className={s.badge}>{scopeLabels[entry.scope]}</span>
                  {entry.usedInContext && <StatusBadge state="succeeded" label="Used just now" />}
                  {entry.pinned && <span className={s.badge}>Pinned</span>}
                  <span className={s.muted}>
                    {sourceLabels[entry.source.kind]}: {entry.source.label},{' '}
                    {formatTime(entry.source.at, locale, timeZone)}
                  </span>
                </div>
                <div className={own.actions} role="group" aria-label={`Actions for memory ${entry.id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      onRequest({ entryId: entry.id, action: entry.pinned ? 'unpin' : 'pin' })
                    }
                  >
                    {entry.pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onRequest({ entryId: entry.id, action: 'forget' })}
                  >
                    Forget
                  </Button>
                  {note && (
                    <span className={s.muted} role="status">
                      {note}
                      {receipt?.status === 'failed' && receipt.message ? `: ${receipt.message}` : ''}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={s.muted}>
          {entries.length ? 'No memories match the filter.' : 'Nothing is remembered yet.'}
        </p>
      )}
    </section>
  );
}
