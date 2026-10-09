'use client';
import type { ComponentProps, ReactNode, SyntheticEvent } from 'react';
import { AIIcon } from '../../providers/icons/icons.js';
import d from '../../shared/styles/display.module.css';

export interface DisclosureProps extends Omit<ComponentProps<'details'>, 'open' | 'onToggle'> {
  /** Rich summary content; it becomes the native summary control. */
  summary: ReactNode;
  /** Controlled open state. Leave undefined for native, uncontrolled behaviour. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Card matches Card surfaces; plain draws only a divider. */
  variant?: 'card' | 'plain';
  children: ReactNode;
}

/** One collapsible section on native details/summary semantics; Accordion's single sibling. */
export function Disclosure({
  summary,
  open,
  defaultOpen = false,
  onOpenChange,
  variant = 'card',
  className = '',
  children,
  ...props
}: DisclosureProps) {
  const controlled = open !== undefined;
  return (
    <details
      {...props}
      open={controlled ? open : defaultOpen || undefined}
      data-part="disclosure"
      data-variant={variant}
      className={`${d.disclosure} ${className}`}
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
        const next = event.currentTarget.open;
        if (controlled && next !== open) {
          // The browser already flipped the element; the host decides the real state.
          event.currentTarget.open = open;
        }
        if (next !== open) onOpenChange?.(next);
      }}
    >
      <summary className={d.disclosureSummary}>
        <span className={d.disclosureSummaryText}>{summary}</span>
        <span className={d.disclosureChevron} aria-hidden="true">
          <AIIcon name="expand" size={16} />
        </span>
      </summary>
      <div className={d.disclosureBody}>{children}</div>
    </details>
  );
}
