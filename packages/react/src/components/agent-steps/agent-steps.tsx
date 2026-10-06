'use client';
import type { Step } from '@stackunseen/ui-core';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Accordion } from '../accordion/accordion.js';
import { AIIcon } from '../../providers/icons/icons.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function AgentSteps({
  variant = 'timeline',
  steps,
  label = 'Execution steps',
}: VariantProps<'AgentSteps'> & {
  steps: Step[];
  label?: string;
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
          <span className={s.stepMarker} data-state={step.state} aria-hidden="true">
            <AIIcon
              name={
                step.state === 'succeeded' ? 'check' : step.state === 'failed' ? 'warning' : 'idle'
              }
              size={12}
            />
          </span>
          <div className={s.grow}>
            <div className={s.row}>
              <strong>{step.label}</strong>
              <StatusBadge state={step.state} />
            </div>
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
