'use client';
import type { ReactNode } from 'react';
import { CheckIcon, ChevronDownIcon, FileTextIcon } from '@radix-ui/react-icons';
import { Shimmer } from '../shimmer/shimmer.js';
import { useDisclosure } from '../../shared/disclosure.js';
import s from '../../shared/styles/assistant.module.css';

export interface PlanStep {
  id: string;
  label: string;
  done?: boolean;
}
export interface PlanProps {
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
  className?: string;
}

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
  className = '',
}: PlanProps) {
  const Heading = `h${headingLevel}` as const;
  const disclosure = useDisclosure({ open, defaultOpen, onOpenChange });
  return (
    <section
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
            aria-label={disclosure.open ? 'Hide plan steps' : 'Show plan steps'}
            {...disclosure.triggerProps}
          >
            <ChevronDownIcon aria-hidden="true" className={s.chevron} />
          </button>
        )}
      </div>
      {steps.length > 0 && (
        <ol className={`${s.list} ${s.stepList}`} {...disclosure.contentProps}>
          {steps.map((step) => (
            <li key={step.id} className={s.step} data-state={step.done ? 'complete' : 'pending'}>
              <span className={s.dot} aria-hidden="true">
                {step.done && <CheckIcon />}
              </span>
              <span className={step.done ? s.done : s.label}>
                {step.label}
                {step.done && <span className={s.srOnly}> (done)</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {actions && <div className={s.footer}>{actions}</div>}
    </section>
  );
}
