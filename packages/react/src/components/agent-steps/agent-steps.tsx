'use client';
import type { Step } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Accordion } from '../accordion/accordion.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './agent-steps.module.css';

const compactLabels: Record<string, string> = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Complete',
};

export function AgentSteps({
  variant = 'timeline',
  steps,
  label = 'Execution steps',
  dependencies = false,
  selectedId,
  onSelect,
}: VariantProps<'AgentSteps'> & {
  steps: Step[];
  label?: string;
  /** Print each step's prerequisites ("After: …", or "Starting step"). */
  dependencies?: boolean;
  /** With onSelect, step names become buttons that report the chosen step. */
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <ol className={s.steps} data-variant={variant} aria-label={label}>
      {steps.length === 0 && <li className={s.muted}>No steps yet.</li>}
      {steps.map((step) => (
        <li
          key={step.id}
          className={s.step}
          aria-current={step.state === 'running' ? 'step' : undefined}
        >
          <span className={own.stepMarker} data-state={step.state} aria-hidden="true">
            <AIIcon
              name={
                step.state === 'succeeded' ? 'check' : step.state === 'failed' ? 'warning' : 'idle'
              }
              size={12}
            />
          </span>
          <div className={s.grow}>
            <div className={s.row}>
              {onSelect ? (
                <Button
                  variant="ghost"
                  aria-pressed={selectedId === step.id}
                  onClick={() => onSelect(step.id)}
                >
                  {step.label}
                </Button>
              ) : (
                <strong>{step.label}</strong>
              )}
              {variant === 'compact' && !['failed', 'blocked'].includes(step.state) ? (
                // The marker already shows progress; keep the words for screen readers only.
                <span className={s.srOnly}>{compactLabels[step.state]}</span>
              ) : (
                <StatusBadge state={step.state} />
              )}
            </div>
            {dependencies && (
              <div className={s.muted}>
                {step.dependencyIds.length
                  ? `After: ${step.dependencyIds.map((id) => steps.find((x) => x.id === id)?.label ?? `Unavailable step ${id}`).join(', ')}`
                  : 'Starting step'}
              </div>
            )}
            {step.detail && (
              <Accordion
                region={false}
                type="single"
                collapsible
                items={[{ value: 'detail', title: 'Details', content: <p>{step.detail}</p> }]}
              />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
