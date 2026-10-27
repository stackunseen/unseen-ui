import type { ComponentProps, ReactNode } from 'react';
import { DataTable, clean, format, largest, level } from './shared.js';
import type { DotDatum } from './shared.js';
import css from './data-dots.module.css';

export interface DotRingProps extends Omit<ComponentProps<'figure'>, 'children'> {
  /** Names the figure for assistive technology and the hidden table. */
  label: string;
  /** One spoke per item, clockwise from the top: hours of a day, minutes, steps of a run. */
  data: readonly DotDatum[];
  /** The value that fills a spoke; defaults to the largest value present. */
  max?: number;
  /** Dots per spoke, from the inside out. */
  depth?: number;
  /** The centre figure, formatted by the application, such as "32 s". */
  value?: ReactNode;
  /** Under the centre figure: "per run". */
  caption?: ReactNode;
  /** Printed around the ring at those item indexes: [{ at: 0, label: '00' }]. */
  ticks?: readonly { at: number; label: string }[];
  /** Unit for the hidden table, such as "runs". */
  unit?: string;
}

/**
 * A ring of dotted spokes, one per item, denser where the value is higher. Every value is
 * also in a hidden table, so the figure never carries information in dots alone.
 */
export function DotRing({
  label,
  data,
  max,
  depth = 5,
  value,
  caption,
  ticks = [],
  unit,
  className = '',
  ...props
}: DotRingProps) {
  const top = largest(data, max);
  const steps = Math.max(1, Math.min(12, Math.round(depth)));
  const count = Math.max(1, data.length);
  const size = 200;
  const centre = size / 2;
  const inner = 58;
  const spacing = 7;
  return (
    <figure
      {...props}
      data-part="dot-ring"
      className={`${css.figure} ${className}`}
      aria-label={label}
    >
      <div className={css.ring}>
        <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
          {data.map((datum, index) => {
            const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
            const on = level(datum.value, top, steps);
            return Array.from({ length: steps }, (_, dot) => {
              const radius = inner + dot * spacing;
              const r = dot < on ? 2.4 : 1.4;
              const stage =
                on === 0 ? undefined : dot < on / 3 ? '1' : dot < (2 * on) / 3 ? '2' : '3';
              return (
                <circle
                  key={`${index}-${dot}`}
                  cx={centre + Math.cos(angle) * radius}
                  cy={centre + Math.sin(angle) * radius}
                  r={r}
                  data-on={dot < on ? '' : undefined}
                  data-level={dot < on ? stage : undefined}
                />
              );
            });
          })}
          {ticks.map((tick) => {
            const angle = (tick.at / count) * Math.PI * 2 - Math.PI / 2;
            const radius = inner + steps * spacing + 8;
            return (
              <text
                key={tick.at}
                x={centre + Math.cos(angle) * radius}
                y={centre + Math.sin(angle) * radius}
                textAnchor="middle"
                dominantBaseline="middle"
                className={css.numeric}
              >
                {tick.label}
              </text>
            );
          })}
        </svg>
        {(value !== undefined || caption !== undefined) && (
          <div className={css.centre} aria-hidden="true">
            {value !== undefined && (
              <span className={`${css.centreValue} ${css.numeric}`}>{value}</span>
            )}
            {caption !== undefined && <span className={css.centreCaption}>{caption}</span>}
          </div>
        )}
      </div>
      {(value !== undefined || caption !== undefined) && (
        <figcaption className={css.srOnly}>
          {value}
          {caption !== undefined ? ` ${caption}` : ''}
        </figcaption>
      )}
      <DataTable
        label={label}
        columns={['Segment', unit ?? 'Value']}
        rows={data.map((datum) => [datum.label, format(clean(datum.value))])}
      />
    </figure>
  );
}
