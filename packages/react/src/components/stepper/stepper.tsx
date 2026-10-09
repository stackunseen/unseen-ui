import type { ComponentProps, ReactNode } from 'react';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.js';
import { Anchor } from '../../shared/link.js';
import d from '../../shared/styles/display.module.css';

export type StepState = 'done' | 'current' | 'upcoming' | 'planned';
export interface StepperStep {
  id: string;
  label: ReactNode;
  href?: string;
  /** Defaults to upcoming. Planned steps have no destination yet. */
  state?: StepState;
}
export interface StepperLink {
  href: string;
  label?: ReactNode;
}
export interface StepperProps extends Omit<ComponentProps<'nav'>, 'children'> {
  /** Names the navigation landmark, for example "Series parts". */
  label: string;
  steps: readonly StepperStep[];
  /** Dots keep labels for assistive technology; list prints them. */
  presentation?: 'dots' | 'list';
  previous?: StepperLink;
  next?: StepperLink;
  /** Prints "Step 2 of 9" from the current step; pass a string to override the words. */
  reading?: boolean | ((current: number, total: number) => ReactNode);
  /** Dots only: shows the step label above the dot on hover and keyboard focus. */
  tooltip?: boolean;
}

const stateWords: Record<StepState, string> = {
  done: 'completed',
  current: 'current',
  upcoming: 'upcoming',
  planned: 'planned',
};

/** A step indicator for series and multi-step paths. Renders on the server; no state. Links use the LinkProvider's component when one is set. */
export function Stepper({
  label,
  steps,
  presentation = 'dots',
  previous,
  next,
  reading = false,
  tooltip = false,
  className = '',
  ...props
}: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  const text =
    reading && currentIndex >= 0
      ? typeof reading === 'function'
        ? reading(currentIndex + 1, steps.length)
        : `Step ${currentIndex + 1} of ${steps.length}`
      : null;
  return (
    <nav
      {...props}
      aria-label={label}
      data-part="stepper"
      data-presentation={presentation}
      className={`${d.stepper} ${className}`}
    >
      {text && <p className={d.stepperReading}>{text}</p>}
      <ol className={d.stepperList}>
        {steps.map((step) => {
          const state = step.state ?? 'upcoming';
          const content =
            presentation === 'dots' ? (
              <>
                <span className={d.stepperDot} aria-hidden="true" />
                <VisuallyHidden>
                  {step.label}
                  {`, ${stateWords[state]}`}
                </VisuallyHidden>
                {tooltip && (
                  <span className={d.stepperTip} aria-hidden="true">
                    {step.label}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className={d.stepperDot} aria-hidden="true" />
                <span className={d.stepperLabel}>{step.label}</span>
                <VisuallyHidden>{`, ${stateWords[state]}`}</VisuallyHidden>
              </>
            );
          return (
            <li key={step.id} className={d.stepperItem} data-state={state}>
              {step.href && state !== 'planned' ? (
                <Anchor
                  href={step.href}
                  className={d.stepperStep}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {content}
                </Anchor>
              ) : (
                <span
                  className={d.stepperStep}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {(previous || next) && (
        <div className={d.stepperNav}>
          {previous && (
            <Anchor href={previous.href} rel="prev" className={d.stepperNavLink}>
              {previous.label ?? 'Previous'}
            </Anchor>
          )}
          {next && (
            <Anchor href={next.href} rel="next" className={d.stepperNavLink} data-direction="next">
              {next.label ?? 'Next'}
            </Anchor>
          )}
        </div>
      )}
    </nav>
  );
}
