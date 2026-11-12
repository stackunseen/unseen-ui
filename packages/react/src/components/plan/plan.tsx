'use client';
import type { ComponentProps, ReactNode } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  Cross2Icon,
  FileTextIcon,
  MinusIcon,
} from '@radix-ui/react-icons';
import { Shimmer } from '../shimmer/shimmer.js';
import { useDisclosure } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export type PlanStepState = 'pending' | 'active' | 'complete' | 'failed' | 'skipped';
export interface PlanStep {
  id: string;
  label: string;
  /** Host-reported progress of the step. Wins over `done`. */
  state?: PlanStepState;
  /** Shorthand for `state: 'complete'`. */
  done?: boolean;
  /** A short host note under the step, such as why it failed or was skipped. */
  detail?: string;
}
export interface PlanProps extends ComponentProps<'section'> {
  title: string;
  description?: string;
  steps?: readonly PlanStep[];
  /** True while the host is still streaming the plan. */
  streaming?: boolean;
  /** Footer actions such as a host-validated "Build" button. */
  actions?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Replaces the built-in wording, for example to translate it. */
  labels?: Partial<PlanLabels>;
  className?: string;
}
export interface PlanLabels {
  hideSteps: string;
  showSteps: string;
  /** Read after a finished step by screen readers. */
  done: string;
  /** Read after a step that is running, failed or was skipped. */
  active: string;
  failed: string;
  skipped: string;
}
const defaultLabels: PlanLabels = {
  hideSteps: 'Hide plan steps',
  showSteps: 'Show plan steps',
  done: 'done',
  active: 'in progress',
  failed: 'failed',
  skipped: 'skipped',
};
const stateOf = (step: PlanStep): PlanStepState =>
  step.state ?? (step.done ? 'complete' : 'pending');

/** A proposed execution plan. Showing a plan does not approve or start it. */
export function Plan({
  title,
  description,
  steps = [],
  streaming = false,
  actions,
  headingLevel = 3,
  open,
  defaultOpen = true,
  onOpenChange,
  labels,
  className = '',
  ...rest
}: PlanProps) {
  const text = { ...defaultLabels, ...labels };
  const Heading = `h${headingLevel}` as const;
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  const spoken: Record<PlanStepState, string | undefined> = {
    pending: undefined,
    active: text.active,
    complete: text.done,
    failed: text.failed,
    skipped: text.skipped,
  };
  return (
    <section
      {...rest}
      className={`${s.root} ${s.card} ${className}`}
      data-part="plan"
      aria-busy={streaming || undefined}
    >
      <div className={s.header}>
        <div>
          <Heading className={s.title}>
            <FileTextIcon aria-hidden="true" />
            {streaming ? <Shimmer>{title}</Shimmer> : title}
          </Heading>
          {description && <p className={s.description}>{description}</p>}
        </div>
        {steps.length > 0 && (
          <button
            className={s.iconButton}
            aria-label={disclosure.open ? text.hideSteps : text.showSteps}
            {...disclosure.triggerProps}
          >
            <ChevronDownIcon aria-hidden="true" className={s.chevron} />
          </button>
        )}
      </div>
      {steps.length > 0 && (
        <ol className={`${s.list} ${s.stepList}`} {...disclosure.contentProps}>
          {steps.map((step) => {
            const state = stateOf(step);
            return (
              <li
                key={step.id}
                className={s.step}
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                <span className={s.dot} aria-hidden="true">
                  {state === 'complete' && <CheckIcon />}
                  {state === 'failed' && <Cross2Icon />}
                  {state === 'skipped' && <MinusIcon />}
                </span>
                <span className={state === 'complete' || state === 'skipped' ? s.done : s.label}>
                  {step.label}
                  {spoken[state] && <span className={s.srOnly}> ({spoken[state]})</span>}
                </span>
                {step.detail && <span className={s.meta}>{step.detail}</span>}
              </li>
            );
          })}
        </ol>
      )}
      {actions && <div className={s.footer}>{actions}</div>}
    </section>
  );
}
