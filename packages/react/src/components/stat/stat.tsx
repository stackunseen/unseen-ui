import type { ComponentProps, ReactNode } from 'react';
import d from '../../shared/styles/display.module.css';

export interface StatProps extends ComponentProps<'div'> {
  label: ReactNode;
  /** A formatted value from the application; the component never computes or abbreviates. */
  value: ReactNode;
  /** A formatted change, for example "+12%"; the sign must be in the text, not only the colour. */
  delta?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  note?: ReactNode;
  /**
   * Card gives each stat its own surface; plain is the bare figure for dense rows; inset is one
   * surface step down for small figures inside a card, under a chart or a larger number.
   */
  variant?: 'card' | 'plain' | 'inset';
}
export type StatGroupProps = ComponentProps<'div'>;

/** One measurement with its label. Renders on the server; no state or runtime. */
export function Stat({
  label,
  value,
  delta,
  trend = 'neutral',
  note,
  variant = 'card',
  className = '',
  ...props
}: StatProps) {
  return (
    <div {...props} data-part="stat" data-variant={variant} className={`${d.stat} ${className}`}>
      <span className={d.statLabel}>{label}</span>
      <span className={d.statValue}>{value}</span>
      {((delta !== undefined && delta !== null) || note) && (
        <span className={d.statMeta}>
          {delta !== undefined && delta !== null && (
            <span className={d.statDelta} data-trend={trend}>
              {delta}
            </span>
          )}
          {note && <span className={d.statNote}>{note}</span>}
        </span>
      )}
    </div>
  );
}

/** A responsive row of stats. Add aria-label when the row needs a name. */
export function StatGroup({ className = '', ...props }: StatGroupProps) {
  return <div role="group" {...props} className={`${d.statGroup} ${className}`} />;
}
