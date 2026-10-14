import type { ComponentProps, ReactNode } from 'react';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.js';
import { Anchor } from '../../shared/link.js';
import d from '../../shared/styles/display.module.css';

/** available: reachable with no progress claim, such as the parts of a series before the one being read. */
export type StepState = 'done' | 'current' | 'upcoming' | 'planned' | 'available';
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
  /** Dots keep labels for assistive technology; list prints them; segments are equal-width bars that share the row. */
  presentation?: 'dots' | 'list' | 'segments';
  previous?: StepperLink;
  next?: StepperLink;
  /** Prints "Step 2 of 9" from the current step; pass a string to override the words. */
  reading?: boolean | ((current: number, total: number) => ReactNode);
  /** A navigation landmark, or a plain list for hosts that already sit inside one. */
  as?: 'nav' | 'div';
  /** Dots only: shows the step label above the dot on hover and keyboard focus. */
  tooltip?: boolean;
}

const stateWords: Record<StepState, string> = {
  done: 'completed',
  current: 'current',
  upcoming: 'upcoming',
  planned: 'planned',
  available: '',
};
const suffix = (state: StepState) => (stateWords[state] ? `, ${stateWords[state]}` : '');

/** A step indicator for series and multi-step paths. Renders on the server; no state. Links use the LinkProvider's component when one is set. */
export function Stepper({
  label,
  steps,
  presentation = 'dots',
  previous,
  next,
  reading = false,
  tooltip = false,
  as = 'nav',
  className = '',
  ...props
}: StepperProps) {
  // Both elements take the same props; the string tag only changes the landmark.
  const Root = (as === 'div' ? 'div' : 'nav') as 'nav';
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  const text =
    reading && currentIndex >= 0
      ? typeof reading === 'function'
        ? reading(currentIndex + 1, steps.length)
        : `Step ${currentIndex + 1} of ${steps.length}`
      : null;
  return (
    <Root
      {...props}
      aria-label={Root === 'nav' ? label : undefined}
      data-part="stepper"
      data-presentation={presentation}
      className={`${d.stepper} ${className}`}
    >
      {text && <p className={d.stepperReading}>{text}</p>}
      <ol className={d.stepperList} aria-label={Root === 'nav' ? undefined : label}>
        {steps.map((step) => {
          const state = step.state ?? 'upcoming';
          const content =
            presentation === 'dots' || presentation === 'segments' ? (
              <>
                {presentation === 'dots' && <span className={d.stepperDot} aria-hidden="true" />}
                <VisuallyHidden>
                  {step.label}
                  {suffix(state)}
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
                {suffix(state) && <VisuallyHidden>{suffix(state)}</VisuallyHidden>}
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
    </Root>
  );
}
