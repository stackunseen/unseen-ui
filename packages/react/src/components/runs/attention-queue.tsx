'use client';
import { useId } from 'react';
import type { KeyboardEvent } from 'react';
import type { ApprovalProposal, Measurement } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import { MeasuredText, formatTime } from './shared.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export type AttentionItem =
  | { kind: 'approval'; id: string; runId: string; proposal: ApprovalProposal; at: string }
  | { kind: 'clarification'; id: string; runId: string; question: string; at: string }
  | { kind: 'handoff'; id: string; runId: string; from: string; at: string }
  | {
      kind: 'failure';
      id: string;
      runId: string;
      message: string;
      at: string;
      retryable: boolean;
    };
export interface AttentionQueueProps extends VariantProps<'AttentionQueue'> {
  items: readonly AttentionItem[];
  /** Host-supplied total; the list may be a page of it. Unknown shows "Count unavailable". */
  count?: Measurement<number>;
  onOpen: (item: AttentionItem) => void;
  onDismiss?: (item: AttentionItem) => void;
  locale?: string;
  timeZone?: string;
  label?: string;
  emptyMessage?: string;
}

function title(item: AttentionItem) {
  switch (item.kind) {
    case 'approval':
      return item.proposal.title;
    case 'clarification':
      return item.question;
    case 'handoff':
      return `Handoff from ${item.from}`;
    case 'failure':
      return item.message;
  }
}
const kindLabels: Record<AttentionItem['kind'], { label: string; state: string }> = {
  approval: { label: 'Needs approval', state: 'waiting-approval' },
  clarification: { label: 'Needs an answer', state: 'waiting-input' },
  handoff: { label: 'Handoff', state: 'pending' },
  failure: { label: 'Failed', state: 'failed' },
};

/** The ordered list of things waiting on a person. Opening an item mounts its own decision control. */
export function AttentionQueue({
  variant = 'list',
  items,
  count,
  onOpen,
  onDismiss,
  locale,
  timeZone,
  label = 'Needs your attention',
  emptyMessage = 'Nothing is waiting on you.',
}: AttentionQueueProps) {
  const id = useId();
  function move(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement;
    const opener = target.closest<HTMLElement>('[data-attention-opener]');
    if (!opener) return;
    const openers = [
      ...event.currentTarget.querySelectorAll<HTMLElement>('[data-attention-opener]'),
    ];
    const index = openers.indexOf(opener);
    let next: HTMLElement | undefined;
    if (event.key === 'ArrowDown') next = openers[index + 1];
    else if (event.key === 'ArrowUp') next = openers[index - 1];
    else if (event.key === 'Home') next = openers[0];
    else if (event.key === 'End') next = openers[openers.length - 1];
    else return;
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }
  return (
    <section
      className={r.queue}
      data-part="attention-queue"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <div className={r.boardHead}>
        <h2 id={`${id}-title`} className={r.boardTitle}>
          {label}
          <span className={r.count}>
            <MeasuredText
              measurement={count ?? { kind: 'measured', value: items.length }}
              format={(value) => String(value)}
              unknownLabel="Count unavailable"
            />
          </span>
        </h2>
      </div>
      {items.length === 0 ? (
        <p className={s.muted} role="status">
          {emptyMessage}
        </p>
      ) : (
        <ul className={r.queueList} onKeyDown={move}>
          {items.map((item) => (
            <li key={item.id} className={r.queueItem} data-kind={item.kind}>
              <span className={r.queueIcon} aria-hidden="true">
                <AIIcon
                  name={
                    item.kind === 'failure'
                      ? 'warning'
                      : item.kind === 'handoff'
                        ? 'user'
                        : item.kind === 'approval'
                          ? 'warning'
                          : 'unknown'
                  }
                  size={14}
                />
              </span>
              <div className={s.grow}>
                <button
                  type="button"
                  className={r.opener}
                  data-attention-opener
                  onClick={() => onOpen(item)}
                >
                  {title(item)}
                </button>
                {variant !== 'compact' && (
                  <div className={r.cardMeta}>
                    <StatusBadge
                      state={kindLabels[item.kind].state}
                      label={kindLabels[item.kind].label}
                    />
                    <span>{formatTime(item.at, locale, timeZone)}</span>
                    {item.kind === 'approval' && <span>{item.proposal.target}</span>}
                    {item.kind === 'failure' && item.retryable && <span>Retry available</span>}
                  </div>
                )}
              </div>
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Dismiss: ${title(item)}`}
                  onClick={() => onDismiss(item)}
                >
                  Dismiss
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
