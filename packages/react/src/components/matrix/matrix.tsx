import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { Anchor } from '../../shared/link.js';
import d from '../../shared/styles/display.module.css';

export interface MatrixAxisItem {
  id: string;
  label: ReactNode;
  href?: string;
  /** A colour or CSS custom property reference, shown as a dot before the label. */
  swatch?: string;
}
/** Plain data keyed by row id, then column id; what a server component passes instead of a function. */
export type MatrixGrid<T> = Readonly<Record<string, Readonly<Record<string, T>>>>;
export interface MatrixProps extends Omit<ComponentProps<'table'>, 'children'> {
  /** Names the table. */
  label: string;
  caption?: ReactNode;
  rows: readonly MatrixAxisItem[];
  columns: readonly MatrixAxisItem[];
  /** A measured count or null for an empty cell. Either this or values. */
  value?: (row: MatrixAxisItem, column: MatrixAxisItem) => number | null;
  /** The counts as plain data; a missing entry is an empty cell. */
  values?: MatrixGrid<number | null>;
  /** Makes a cell a link, for example to the filtered list behind the count. */
  href?: (row: MatrixAxisItem, column: MatrixAxisItem) => string | undefined;
  /** Cell links as plain data. */
  hrefs?: MatrixGrid<string>;
  /** A hover title and accessible name for a cell, such as "AI & Models × Basics: 6 entries". */
  cellLabel?: (row: MatrixAxisItem, column: MatrixAxisItem, value: number | null) => string;
  /** Cell names as plain data. */
  cellLabels?: MatrixGrid<string>;
  /** The value that gets the full fill; defaults to the largest value present. */
  max?: number;
  format?: (value: number) => ReactNode;
  /** Names the keyboard-scrollable region. */
  scrollLabel?: string;
  /** Angled headers rotate the column labels so many narrow columns stay readable. */
  columnHeader?: 'horizontal' | 'angled';
  /** Printed in empty cells, for example a middle dot; empty cells are otherwise blank. */
  zero?: ReactNode;
  /** Row totals as a trailing column, column totals as a trailing row, or both. Totals print but stay out of the fill scale. */
  totals?: 'rows' | 'columns' | 'both';
  /** Heads the totals column and row. */
  totalsLabel?: ReactNode;
}

/** How far the rotated last label reaches past its column, in em, from its character count. */
const rowTotalsWanted = (totals: MatrixProps['totals']) => totals === 'rows' || totals === 'both';
const angledOverhang = (label: ReactNode) =>
  typeof label === 'string' || typeof label === 'number'
    ? `${Math.max(2, Math.ceil(String(label).length * 0.34 * 10) / 10)}em`
    : undefined;

/**
 * A heatmap table. Every cell prints its number; the single-hue fill from the primary token
 * only reinforces it, capped by --ai-matrix-max-level, and the text switches to the primary
 * foreground once the fill is dark enough (the theme computes that level as --ai-matrix-flip).
 * Row and column headers may be links, and the table scrolls inside a labelled, focusable
 * region. Counts, links and cell names take functions or plain data, so a server component
 * can pass them.
 */
export function Matrix({
  label,
  caption,
  rows,
  columns,
  value,
  values: valueGrid,
  href,
  hrefs,
  cellLabel,
  cellLabels,
  max,
  format = (count) => count,
  scrollLabel,
  columnHeader = 'horizontal',
  zero,
  totals,
  totalsLabel = 'All',
  className = '',
  ...props
}: MatrixProps) {
  const values = rows.map((row) =>
    columns.map((column) => valueGrid?.[row.id]?.[column.id] ?? value?.(row, column) ?? null),
  );
  const linkFor = (row: MatrixAxisItem, column: MatrixAxisItem) =>
    hrefs?.[row.id]?.[column.id] ?? href?.(row, column);
  const nameFor = (row: MatrixAxisItem, column: MatrixAxisItem, count: number | null) =>
    cellLabels?.[row.id]?.[column.id] ?? cellLabel?.(row, column, count);
  const lastLabel = rowTotalsWanted(totals) ? totalsLabel : columns[columns.length - 1]?.label;
  const endPadding = columnHeader === 'angled' ? angledOverhang(lastLabel) : undefined;
  const rowTotals = rowTotalsWanted(totals);
  const columnTotals = totals === 'columns' || totals === 'both';
  const sum = (items: readonly (number | null)[]) =>
    items.reduce<number>((total, item) => total + (item ?? 0), 0);
  const columnSums = columns.map((_, index) => sum(values.map((row) => row[index] ?? null)));
  const total = (count: number) => (
    <td className={d.matrixTotal} data-total="">
      <span className={d.matrixCell}>{format(count)}</span>
    </td>
  );
  const largest =
    max ??
    values.flat().reduce<number>((top, item) => (item !== null && item > top ? item : top), 0);
  const level = (count: number | null) =>
    count === null || count <= 0 || largest <= 0 ? 0 : Math.min(1, count / largest);
  const axis = (item: MatrixAxisItem) => {
    const label = (
      <span className={d.matrixAxis}>
        {item.swatch && (
          <span className={d.matrixSwatch} aria-hidden="true" style={{ background: item.swatch }} />
        )}
        {item.label}
      </span>
    );
    return item.href ? (
      <Anchor href={item.href} className={d.matrixAxisLink}>
        {label}
      </Anchor>
    ) : (
      label
    );
  };
  return (
    <div
      className={d.matrixScroll}
      role="region"
      aria-label={scrollLabel ?? `${label} table scroll area`}
      tabIndex={0}
    >
      <table
        {...props}
        aria-label={label}
        data-part="matrix"
        data-column-header={columnHeader}
        className={`${d.matrix} ${className}`}
        style={
          endPadding
            ? ({ ...props.style, '--matrix-end-padding': endPadding } as CSSProperties)
            : props.style
        }
      >
        {caption && <caption className={d.matrixCaption}>{caption}</caption>}
        <thead>
          <tr>
            <td className={d.matrixCorner} />
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {columnHeader === 'angled' ? (
                  <span className={d.matrixAngled}>{axis(column)}</span>
                ) : (
                  axis(column)
                )}
              </th>
            ))}
            {rowTotals && (
              <th scope="col" className={d.matrixTotalHead}>
                {columnHeader === 'angled' ? (
                  <span className={d.matrixAngled}>{totalsLabel}</span>
                ) : (
                  totalsLabel
                )}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id}>
              <th scope="row">{axis(row)}</th>
              {columns.map((column, columnIndex) => {
                const count = values[rowIndex]![columnIndex]!;
                const cellHref = count === null ? undefined : linkFor(row, column);
                const name = nameFor(row, column, count);
                const style = { '--matrix-level': level(count) } as CSSProperties;
                const text =
                  count === null ? (
                    zero === undefined ? (
                      ''
                    ) : (
                      <span className={d.matrixZero} aria-hidden="true">
                        {zero}
                      </span>
                    )
                  ) : (
                    format(count)
                  );
                return (
                  <td key={column.id} style={style} data-empty={count === null || undefined}>
                    {cellHref ? (
                      <Anchor
                        href={cellHref}
                        className={d.matrixCell}
                        title={name}
                        aria-label={name}
                      >
                        {text}
                      </Anchor>
                    ) : (
                      <span className={d.matrixCell} title={name}>
                        {text}
                      </span>
                    )}
                  </td>
                );
              })}
              {rowTotals && total(sum(values[rowIndex]!))}
            </tr>
          ))}
          {columnTotals && (
            <tr className={d.matrixTotalRow}>
              <th scope="row" className={d.matrixTotalHead}>
                {totalsLabel}
              </th>
              {columnSums.map((count, index) => (
                <td key={columns[index]!.id} className={d.matrixTotal} data-total="">
                  <span className={d.matrixCell}>{format(count)}</span>
                </td>
              ))}
              {rowTotals && total(sum(columnSums))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
