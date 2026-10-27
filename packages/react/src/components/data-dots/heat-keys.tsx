import type { ComponentProps, CSSProperties } from 'react';
import { DataTable, clean, format, level } from './shared.js';
import css from './data-dots.module.css';

export interface HeatKey {
  id: string;
  /** Printed on the cell: "S", "⌘", "space". */
  label: string;
  /** A measured count; cells with none stay unshaded. */
  value: number;
  /** Cell width in cell units, for a space bar or a wide key. */
  span?: number;
}
export interface HeatKeyRow {
  keys: readonly HeatKey[];
  /** Indent in cell units, for a staggered keyboard. */
  offset?: number;
}
export interface HeatKeysProps extends Omit<ComponentProps<'figure'>, 'children'> {
  /** Names the figure for assistive technology and the hidden table. */
  label: string;
  rows: readonly HeatKeyRow[];
  /** The value that gets the full fill; defaults to the largest value present. */
  max?: number;
  /** Printed beside the scale: ['Fewer', 'More']. Leave it out to hide the scale. */
  scale?: readonly [string, string];
  /** Unit for the hidden table, such as "presses". */
  unit?: string;
}

/**
 * A grid of cells shaded in four steps by their value, laid out like a keyboard or any grid.
 * The label stays printed on every cell, and every count is in a hidden table.
 */
export function HeatKeys({
  label,
  rows,
  max,
  scale,
  unit,
  className = '',
  ...props
}: HeatKeysProps) {
  const all = rows.flatMap((row) => row.keys);
  const top =
    max !== undefined && Number.isFinite(max) && max > 0
      ? max
      : Math.max(1, ...all.map((key) => clean(key.value)));
  return (
    <figure
      {...props}
      data-part="heat-keys"
      className={`${css.figure} ${className}`}
      aria-label={label}
    >
      <div className={css.keys} aria-hidden="true">
        {rows.map((row, index) => (
          <div
            key={index}
            className={css.keyRow}
            style={row.offset ? ({ '--offset': row.offset } as CSSProperties) : undefined}
          >
            {row.keys.map((key) => {
              const shade = level(key.value, top, 4);
              return (
                <span
                  key={key.id}
                  className={css.key}
                  data-level={shade || undefined}
                  data-wide={key.span && key.span > 1 ? '' : undefined}
                  style={
                    key.span && key.span > 1 ? ({ '--span': key.span } as CSSProperties) : undefined
                  }
                >
                  {key.label}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {scale && (
        <figcaption>
          <span className={css.scale}>
            {scale[0]}
            <i data-level="0" />
            <i data-level="1" />
            <i data-level="2" />
            <i data-level="3" />
            <i data-level="4" />
            {scale[1]}
          </span>
        </figcaption>
      )}
      <DataTable
        label={label}
        columns={['Key', unit ?? 'Value']}
        rows={all.map((key) => [key.label, format(clean(key.value))])}
      />
    </figure>
  );
}
