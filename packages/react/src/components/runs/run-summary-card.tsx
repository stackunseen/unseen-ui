'use client';
import { useLocale } from '../../providers/locale/locale.js';
import type { ReactNode } from 'react';
import type { CommandReceipt, Measurement, Run } from '@stackunseen/ui-core';
import { safeUrl } from '@stackunseen/ui-core';
import { StatusBadge } from '../status-badge/status-badge.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import { MeasuredText, formatDuration, formatMoney } from './shared.js';
import type { Money } from './shared.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export type RunOutcome = 'succeeded' | 'partial' | 'failed' | 'cancelled' | 'unknown';
export interface RunEffect {
  id: string;
  kind: 'file' | 'record' | 'message' | 'external';
  label: string;
  href?: string;
  /** The receipt that confirms this effect. Without one it is shown as unconfirmed. */
  receiptId?: string;
}
export interface RunSummary {
  run: Run;
  goal: string;
  outcome: RunOutcome;
  /** Public text only. */
  summary: string;
  effects: readonly RunEffect[];
  notDone?: readonly string[];
  duration?: Measurement<number>;
  cost?: Measurement<Money>;
}
export interface RunSummaryCardProps extends VariantProps<'RunSummaryCard'> {
  summary: RunSummary;
  receipts?: readonly CommandReceipt[];
  onOpenEffect?: (effect: RunEffect) => void;
  /** Host actions such as "Open run" or "Revert". */
  actions?: ReactNode;
  locale?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const outcomes: Record<RunOutcome, { state: string; label: string; text: string }> = {
  succeeded: { state: 'succeeded', label: 'Succeeded', text: 'The run finished.' },
  partial: {
    state: 'blocked',
    label: 'Partly done',
    text: 'The run finished with items left undone.',
  },
  failed: { state: 'failed', label: 'Failed', text: 'The run did not finish.' },
  cancelled: { state: 'cancelled', label: 'Cancelled', text: 'The run was stopped.' },
  unknown: {
    state: 'outcome-unknown',
    label: 'Outcome unknown',
    text: 'How this run ended isn’t confirmed yet. Check before acting on what it changed.',
  },
};
/** Root-relative app paths or http(s) URLs; anything else is shown as plain text. */
function allowedHref(value: string): string | undefined {
  if (value.startsWith('/') && !value.startsWith('//'))
    return value.length <= 4096 ? value : undefined;
  return safeUrl(value);
}
const effectKinds: Record<RunEffect['kind'], string> = {
  file: 'File',
  record: 'Record',
  message: 'Message',
  external: 'External',
};

/** What a run did, read after the fact: goal, outcome, effects with receipts, and what was left. */
export function RunSummaryCard({
  variant = 'card',
  summary,
  receipts = [],
  onOpenEffect,
  actions,
  locale: localeProp,
  className = '',
}: RunSummaryCardProps) {
  const locale = useLocale(localeProp);
  const outcome = outcomes[summary.outcome] ?? outcomes.unknown;
  const confirmed = new Set(
    receipts
      .filter((receipt) => receipt.status === 'acknowledged')
      .map((receipt) => receipt.commandId),
  );
  return (
    <article
      className={`${variant === 'card' ? s.panel : ''} ${r.summary} ${className}`}
      data-part="run-summary"
      data-variant={variant}
      data-outcome={summary.outcome}
      aria-label={`Run summary: ${summary.goal}`}
    >
      <div className={r.cardHead}>
        <h3 className={r.summaryTitle}>{summary.goal}</h3>
        <StatusBadge state={outcome.state} label={outcome.label} />
      </div>
      <p className={r.summaryText}>{summary.summary}</p>
      {summary.outcome === 'unknown' && (
        <p className={r.waiting} role="status">
          {outcome.text}
        </p>
      )}
      <div className={r.cardMeta}>
        {summary.duration && (
          <span>
            Duration: <MeasuredText measurement={summary.duration} format={formatDuration} />
          </span>
        )}
        {summary.cost && (
          <span>
            Cost:{' '}
            <MeasuredText
              measurement={summary.cost}
              format={(value) => formatMoney(value, locale)}
            />
          </span>
        )}
        <span>Attempt {summary.run.attemptId}</span>
      </div>
      {summary.effects.length > 0 && (
        <div className={r.effects}>
          <h4 className={r.subheading}>What changed</h4>
          <ul className={r.effectList} aria-label="Effects">
            {summary.effects.map((effect) => {
              const ok = !!effect.receiptId && confirmed.has(effect.receiptId);
              const href = effect.href ? allowedHref(effect.href) : undefined;
              const body = (
                <>
                  <span className={r.effectKind}>{effectKinds[effect.kind]}</span>
                  <span className={s.grow}>{effect.label}</span>
                  <span className={r.effectState} data-confirmed={ok || undefined}>
                    <AIIcon name={ok ? 'check' : 'unknown'} size={12} />
                    {ok ? 'Confirmed' : 'Unconfirmed'}
                  </span>
                </>
              );
              return (
                <li key={effect.id} className={r.effect}>
                  {href ? (
                    <a className={r.effectLink} href={href} onClick={() => onOpenEffect?.(effect)}>
                      {body}
                    </a>
                  ) : onOpenEffect ? (
                    <button
                      type="button"
                      className={r.effectLink}
                      onClick={() => onOpenEffect(effect)}
                    >
                      {body}
                    </button>
                  ) : (
                    <span className={r.effectLink}>{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {summary.notDone && summary.notDone.length > 0 && (
        <div className={r.effects}>
          <h4 className={r.subheading}>Not done</h4>
          <ul className={r.notDone}>
            {summary.notDone.map((item, index) => (
              <li key={`${index}:${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {actions && <div className={s.actions}>{actions}</div>}
    </article>
  );
}
