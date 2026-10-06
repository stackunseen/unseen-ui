'use client';
import type { Step } from '@stackunseen/ui-core';
import { Button } from '../button/button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function Workflow({
  variant = 'list',
  steps,
  selectedId,
  onSelect,
}: VariantProps<'Workflow'> & {
  steps: Step[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <ol
      className={`${s.list} ${s.workflow}`}
      data-variant={variant}
      aria-label="Workflow dependencies"
    >
      {!steps.length && <li className={s.muted}>No workflow steps reported.</li>}
      {steps.map((step) => (
        <li key={step.id} className={s.item}>
          <div className={s.grow}>
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
            <div className={s.muted}>
              {step.dependencyIds.length
                ? `After: ${step.dependencyIds.map((id) => steps.find((x) => x.id === id)?.label ?? `Unavailable step ${id}`).join(', ')}`
                : 'Starting step'}
            </div>
          </div>
          <StatusBadge state={step.state} />
        </li>
      ))}
    </ol>
  );
}
