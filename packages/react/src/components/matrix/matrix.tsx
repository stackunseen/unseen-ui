import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import d from '../../shared/styles/display.module.css';

export interface MatrixAxisItem {
  id: string;
  label: ReactNode;
  href?: string;
}
export interface MatrixProps extends Omit<ComponentProps<'table'>, 'children'> {
  /** Names the table. */
  label: string;
  caption?: ReactNode;
  rows: readonly MatrixAxisItem[];
  columns: readonly MatrixAxisItem[];
  /** A measured count or null for an empty cell. */
  value: (row: MatrixAxisItem, column: MatrixAxisItem) => number | null;
  /** Makes a cell a link, for example to the filtered list behind the count. */
  href?: (row: MatrixAxisItem, column: MatrixAxisItem) => string | undefined;
  /** The value that gets the full fill; defaults to the largest value present. */
  max?: number;
  format?: (value: number) => ReactNode;
  /** Names the keyboard-scrollable region. */
  scrollLabel?: string;
}

/**
 * A heatmap table. Every cell prints its number; the single-hue fill from the primary token
 * only reinforces it. Row and column headers may be links, and the table scrolls inside a
 * labelled, focusable region.
 */
export function Matrix({
  label,
  caption,
  rows,
  columns,
  value,
  href,
  max,
  format = (count) => count,
  scrollLabel,
  className = '',
  ...props
}: MatrixProps) {
  const values = rows.map((row) => columns.map((column) => value(row, column)));
  const largest =
    max ??
    values.flat().reduce<number>((top, item) => (item !== null && item > top ? item : top), 0);
  const level = (count: number | null) =>
    count === null || count <= 0 || largest <= 0 ? 0 : Math.min(1, count / largest);
  const axis = (item: MatrixAxisItem) =>
    item.href ? (
      <a href={item.href} className={d.matrixAxisLink}>
        {item.label}
      </a>
    ) : (
      item.label
    );
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
        className={`${d.matrix} ${className}`}
      >
        {caption && <caption className={d.matrixCaption}>{caption}</caption>}
        <thead>
          <tr>
            <td />
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {axis(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id}>
              <th scope="row">{axis(row)}</th>
              {columns.map((column, columnIndex) => {
                const count = values[rowIndex]![columnIndex]!;
                const cellHref = count === null ? undefined : href?.(row, column);
                const style = { '--matrix-level': level(count) } as CSSProperties;
                const text = count === null ? '' : format(count);
                return (
                  <td key={column.id} style={style} data-empty={count === null || undefined}>
                    {cellHref ? (
                      <a href={cellHref} className={d.matrixCell}>
                        {text}
                      </a>
                    ) : (
                      <span className={d.matrixCell}>{text}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
