'use client';
import { type ComponentProps, useId } from 'react';
import type { CommandReceipt, SubmissionState } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import g from './governance.module.css';

export interface DryRunEffect {
  id: string;
  kind: 'file' | 'record' | 'message' | 'money' | 'external';
  label: string;
  target: string;
  reversible: boolean | 'unknown';
  detail?: string;
}
export interface DryRunPlan {
  id: string;
  version: number;
  title: string;
  summary?: string;
  effects: readonly DryRunEffect[];
}
export interface DryRunDecision {
  planId: string;
  version: number;
  decision: 'run' | 'cancel';
  /** Effects the person asked the agent to leave out; the host re-plans. */
  skippedIds: string[];
}
export interface DryRunPreviewProps
  extends VariantProps<'DryRunPreview'>, ComponentProps<'section'> {
  plan: DryRunPlan;
  skippedIds: readonly string[];
  onSkippedChange: (ids: string[]) => void;
  onDecision: (decision: DryRunDecision) => void;
  submission?: SubmissionState;
  receipt?: CommandReceipt;
  /** True when the host has a newer plan version; decisions are blocked until it is shown. */
  stale?: boolean;
  label?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

const kindLabels: Record<DryRunEffect['kind'], string> = {
  file: 'File',
  record: 'Record',
  message: 'Message',
  money: 'Money',
  external: 'External',
};

/** The agent's declared effects before anything runs, with a veto per line and one decision. */
export function DryRunPreview({
  variant = 'card',
  plan,
  skippedIds,
  onSkippedChange,
  onDecision,
  submission = 'idle',
  receipt,
  stale = false,
  label,
  className = '',
  ...rest
}: DryRunPreviewProps) {
  const id = useId();
  const skipped = new Set(skippedIds);
  const kept = plan.effects.filter((effect) => !skipped.has(effect.id));
  const irreversible = kept.filter((effect) => effect.reversible === false).length;
  const unknown = kept.filter((effect) => effect.reversible === 'unknown').length;
  const locked = stale || submission !== 'idle';
  const toggle = (effectId: string) => {
    const next = new Set(skipped);
    if (next.has(effectId)) next.delete(effectId);
    else next.add(effectId);
    onSkippedChange([...next]);
  };
  const decide = (decision: 'run' | 'cancel') =>
    onDecision({ planId: plan.id, version: plan.version, decision, skippedIds: [...skipped] });
  return (
    <section
      {...rest}
      className={`${variant === 'card' ? s.panel : ''} ${g.root} ${className}`}
      data-part="dry-run-preview"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <div className={g.grantHead}>
        <h3 id={`${id}-title`} className={g.title}>
          {label ?? plan.title}
        </h3>
        <StatusBadge
          state={
            stale
              ? 'superseded'
              : submission === 'idle'
                ? 'pending'
                : submission === 'acknowledged'
                  ? 'succeeded'
                  : submission === 'failed'
                    ? 'failed'
                    : submission === 'outcome-unknown'
                      ? 'outcome-unknown'
                      : 'running'
          }
          label={
            stale
              ? 'Plan changed'
              : submission === 'idle'
                ? 'Not run yet'
                : submission === 'submitting'
                  ? 'Sending'
                  : submission === 'acknowledged'
                    ? 'Confirmed'
                    : submission === 'failed'
                      ? 'Failed'
                      : 'Outcome unknown'
          }
        />
      </div>
      {plan.summary && <p className={g.summary}>{plan.summary}</p>}
      <p className={s.muted}>
        Nothing has run. {kept.length} of {plan.effects.length} effects would run
        {irreversible ? `, ${irreversible} cannot be undone` : ''}
        {unknown ? `, ${unknown} with unknown reversibility` : ''}.
      </p>
      <ul className={g.list} aria-label="Declared effects">
        {plan.effects.map((effect) => {
          const isSkipped = skipped.has(effect.id);
          return (
            <li
              key={effect.id}
              className={g.effect}
              data-skipped={isSkipped || undefined}
              data-reversible={String(effect.reversible)}
            >
              <label className={g.effectRow}>
                <Checkbox
                  checked={isSkipped}
                  disabled={locked}
                  onCheckedChange={() => toggle(effect.id)}
                  aria-label={`Skip: ${effect.label}`}
                />
                <span className={g.effectBody}>
                  <span className={g.effectKind}>{kindLabels[effect.kind]}</span>
                  <span className={g.effectLabel}>{effect.label}</span>
                  <span className={g.meta}>
                    <span>{effect.target}</span>
                    <span className={effect.reversible === false ? g.warn : undefined}>
                      {effect.reversible === true
                        ? 'Reversible'
                        : effect.reversible === false
                          ? 'Cannot be undone'
                          : 'Reversibility unknown'}
                    </span>
                    {effect.detail && <span>{effect.detail}</span>}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {stale && (
        <p className={g.warn} role="status">
          There’s a newer version of this plan. Review it before deciding.
        </p>
      )}
      {receipt?.message && (
        <p className={s.muted} role="status">
          {receipt.message}
        </p>
      )}
      <div className={s.actions}>
        <Button size="sm" variant="outline" disabled={locked} onClick={() => decide('cancel')}>
          Cancel plan
        </Button>
        <Button size="sm" disabled={locked || kept.length === 0} onClick={() => decide('run')}>
          {skipped.size ? `Run ${kept.length} effects` : 'Run plan'}
        </Button>
      </div>
    </section>
  );
}
