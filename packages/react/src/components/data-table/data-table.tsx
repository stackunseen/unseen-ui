'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { useMemo } from 'react';
import { Button } from '../button/button.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import type { VariantProps } from '../../shared/variants.js';
import g from '../../shared/styles/structured.module.css';
import c from '../../shared/styles/coding.module.css';
import s from '../../shared/styles/agent-controls.module.css';
import a from '../../shared/styles/action-layout.module.css';
import b from '../../shared/styles/styles.module.css';

export type TableCellValue = string | number | boolean | null;
export type TableCellFormat =
  | { kind: 'number'; options?: Intl.NumberFormatOptions }
  | { kind: 'date'; options?: Intl.DateTimeFormatOptions }
  /** Shows the text as a badge; tones map cell values to a badge colour. */
  | { kind: 'status'; tones?: Record<string, 'primary' | 'success' | 'warning' | 'danger'> };
export interface TableColumn {
  id: string;
  label: string;
  sortable?: boolean;
  format?: TableCellFormat;
}
export interface TableRow {
  id: string;
  cells: Record<string, TableCellValue>;
}
export interface TablePagination {
  /** Zero-based host-owned page index; supplied rows belong to this page. */
  pageIndex: number;
  pageSize: number;
  totalRows?: number;
  /** Required to enable next-page navigation when the total is unknown. */
  hasNextPage?: boolean;
}
export interface DataTableProps extends VariantProps<'DataTable'> {
  columns: readonly TableColumn[];
  /** A host-owned window of at most 100 rows. Replace it when paging or reaching the cap. */
  rows: readonly TableRow[];
  caption: string;
  sort?: { columnId: string; direction: 'asc' | 'desc' };
  onSort?: (sort: { columnId: string; direction: 'asc' | 'desc' }) => void;
  /** Explicit locale for deterministic server/client number and date formatting. Defaults to en-US. */
  locale?: string;
  /** Trusted application formatter; returns bounded inert text, never generated React/HTML. */
  formatCell?: (value: TableCellValue, column: TableColumn, row: TableRow) => string;
  pagination?: TablePagination;
  onPageChange?: (pageIndex: number) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  error?: string;
}
function defaultText(value: unknown, formatter: Intl.NumberFormat) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number')
    return Number.isFinite(value) ? formatter.format(value) : 'Invalid number';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'string' ? value.slice(0, 5000) : 'Unsupported value';
}
export function DataTable({
  columns,
  rows,
  caption,
  sort,
  onSort,
  locale: localeProp,
  formatCell,
  pagination,
  onPageChange,
  onLoadMore,
  loading,
  error,
  variant = 'table',
}: DataTableProps) {
  const locale = useLocale(localeProp);
  const shownColumns = columns.slice(0, 20);
  const shownRows = rows.slice(0, 100);
  const invalid =
    new Set(shownColumns.map((column) => column.id)).size !== shownColumns.length ||
    new Set(shownRows.map((row) => row.id)).size !== shownRows.length ||
    shownColumns.some((column) => !column.id.trim()) ||
    shownRows.some((row) => !row.id.trim());
  const formatting = useMemo(() => {
    let resolvedLocale = locale,
      localeFallback = false;
    try {
      if (!Intl.NumberFormat.supportedLocalesOf([locale]).length)
        throw new Error('Unsupported locale');
    } catch {
      resolvedLocale = 'en-US';
      localeFallback = true;
    }
    const number = new Intl.NumberFormat(resolvedLocale);
    const formats = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
    const invalidFormats: string[] = [];
    for (const column of columns.slice(0, 20)) {
      if (!column.format || column.format.kind === 'status') continue;
      try {
        formats.set(
          column.id,
          column.format.kind === 'number'
            ? new Intl.NumberFormat(resolvedLocale, column.format.options)
            : new Intl.DateTimeFormat(resolvedLocale, {
                ...(column.format.options ?? { dateStyle: 'medium' }),
                timeZone: column.format.options?.timeZone ?? 'UTC',
              }),
        );
      } catch {
        invalidFormats.push(column.label);
      }
    }
    return { number, formats, invalidFormats, localeFallback };
  }, [locale, columns]);
  function display(row: TableRow, column: TableColumn) {
    const value = row.cells[column.id];
    if (formatCell) {
      try {
        const text = formatCell(value ?? null, column, row);
        return typeof text === 'string' ? text.slice(0, 5000) : 'Invalid cell formatter';
      } catch {
        return 'Unable to format value';
      }
    }
    if (value === null || value === undefined) return '—';
    const formatter = formatting.formats.get(column.id);
    if (formatter instanceof Intl.DateTimeFormat) {
      if (typeof value !== 'string' && typeof value !== 'number') return 'Invalid date';
      // Reject permissive locale-dependent Date parsing; ISO dates/instants and epoch milliseconds are supported.
      if (
        typeof value === 'string' &&
        !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
      )
        return 'Invalid date';
      if (typeof value === 'string') {
        const day = value.slice(0, 10);
        const calendar = new Date(`${day}T00:00:00Z`);
        if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day)
          return 'Invalid date';
      }
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? formatter.format(date) : 'Invalid date';
    }
    if (formatter instanceof Intl.NumberFormat) {
      return typeof value === 'number' && Number.isFinite(value)
        ? formatter.format(value)
        : 'Invalid number';
    }
    return defaultText(value, formatting.number);
  }
  const selectedColumn = shownColumns.find((column) => column.id === sort?.columnId);
  function requestSort(column: TableColumn) {
    if (!loading)
      onSort?.({
        columnId: column.id,
        direction: sort?.columnId === column.id && sort.direction === 'asc' ? 'desc' : 'asc',
      });
  }
  function sortLabel(column: TableColumn) {
    return `Sort by ${column.label}${sort?.columnId === column.id ? `, currently ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`;
  }
  const start = pagination ? pagination.pageIndex * pagination.pageSize : 0;
  const knownNext =
    pagination?.totalRows === undefined
      ? undefined
      : start + pagination.pageSize < pagination.totalRows;
  const paginationValid =
    !pagination ||
    (Number.isSafeInteger(pagination.pageIndex) &&
      pagination.pageIndex >= 0 &&
      Number.isSafeInteger(pagination.pageSize) &&
      pagination.pageSize >= 1 &&
      pagination.pageSize <= 100 &&
      Number.isSafeInteger(start) &&
      Number.isSafeInteger(pagination.pageIndex + 1) &&
      Number.isSafeInteger(start + pagination.pageSize) &&
      Number.isSafeInteger(start + shownRows.length) &&
      rows.length <= pagination.pageSize &&
      (pagination.totalRows === undefined ||
        (Number.isSafeInteger(pagination.totalRows) &&
          pagination.totalRows >= start + shownRows.length)) &&
      (knownNext === undefined ||
        pagination.hasNextPage === undefined ||
        knownNext === pagination.hasNextPage));
  const nextAvailable = knownNext ?? pagination?.hasNextPage;
  const emptyMessage = loading
    ? 'Loading table rows…'
    : error
      ? 'Rows unavailable. Try loading them again.'
      : 'No rows to display.';
  return (
    <div className={g.root} data-part="data-table" data-variant={variant}>
      {error && (
        <p role="alert" className={g.error}>
          {error}
        </p>
      )}
      {invalid || !shownColumns.length ? (
        <>
          <strong>{caption}</strong>
          <p role="status" className={g.error}>
            {invalid
              ? 'Table row and column identities must be unique and nonempty.'
              : 'No columns supplied. Provide a table schema.'}
          </p>
        </>
      ) : variant === 'cards' ? (
        <>
          <strong>{caption}</strong>
          {onSort && shownColumns.some((column) => column.sortable) && (
            <div className={s.row} role="group" aria-label="Sort table rows">
              {shownColumns
                .filter((column) => column.sortable)
                .map((column) => (
                  <Button
                    key={column.id}
                    variant="ghost"
                    disabled={loading}
                    aria-label={sortLabel(column)}
                    onClick={() => requestSort(column)}
                  >
                    {column.label}{' '}
                    {sort?.columnId === column.id ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </Button>
                ))}
            </div>
          )}
          <div className={g.cards} aria-busy={loading || undefined}>
            {shownRows.map((row) => (
              <article key={row.id} className={g.card}>
                {shownColumns.map((column) => (
                  <p key={column.id}>
                    <strong>{column.label}: </strong>
                    {display(row, column)}
                  </p>
                ))}
              </article>
            ))}
          </div>
          {!shownRows.length && (
            <p role="status" className={s.muted}>
              {emptyMessage}
            </p>
          )}
        </>
      ) : (
        <div
          className={c.scroll}
          role="group"
          aria-label={caption}
          tabIndex={0}
          aria-busy={loading || undefined}
        >
          <table className={g.table}>
            <caption>{caption}</caption>
            <thead>
              <tr>
                {shownColumns.map((column) => (
                  <th
                    scope="col"
                    key={column.id}
                    data-format={column.format?.kind}
                    aria-sort={
                      sort?.columnId === column.id
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {column.sortable && onSort ? (
                      <Button
                        className={g.sortControl}
                        variant="ghost"
                        disabled={loading}
                        aria-label={sortLabel(column)}
                        onClick={() => requestSort(column)}
                      >
                        <span>{column.label}</span>
                        <span className={g.sortIndicator} aria-hidden="true">
                          {sort?.columnId === column.id
                            ? sort.direction === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </Button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownRows.length ? (
                shownRows.map((row) => (
                  <tr key={row.id}>
                    {shownColumns.map((column) => (
                      <td key={column.id} data-format={column.format?.kind}>
                        {column.format?.kind === 'status' ? (
                          <span
                            className={b.badge}
                            data-tone={column.format.tones?.[String(row.cells[column.id])]}
                          >
                            {display(row, column)}
                          </span>
                        ) : (
                          display(row, column)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={shownColumns.length}>
                    <p role="status" className={s.muted}>
                      {emptyMessage}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {sort && !invalid && shownColumns.length > 0 && (
        <p className={s.muted} role="status">
          {selectedColumn
            ? `Sorted by ${selectedColumn.label}, ${sort.direction === 'asc' ? 'ascending' : 'descending'}.`
            : 'The column this list is sorted by isn’t shown in this view.'}
        </p>
      )}
      {loading && <LoadingIndicator label="Loading table rows" />}
      {formatting.localeFallback && (
        <p role="status" className={s.muted}>
          Requested locale unavailable. Displaying en-US formatting.
        </p>
      )}
      {!!formatting.invalidFormats.length && (
        <p role="status" className={g.error}>
          Invalid format for {formatting.invalidFormats.join(', ')}. Showing unformatted values.
        </p>
      )}
      {pagination &&
        (paginationValid ? (
          <div className={g.pagination} role="group" aria-label={`Pagination for ${caption}`}>
            <div className={g.pageSummary}>
              <strong>
                Page {pagination.pageIndex + 1}
                {pagination.totalRows
                  ? ` of ${Math.ceil(pagination.totalRows / pagination.pageSize)}`
                  : ''}
              </strong>
              <span className={s.muted}>
                {shownRows.length
                  ? `Rows ${start + 1}–${start + shownRows.length}${pagination.totalRows !== undefined ? ` of ${pagination.totalRows}` : ' · total unknown'}`
                  : 'No rows on this page.'}
              </span>
              {nextAvailable === undefined && (
                <span className={s.muted}>Next page availability unknown.</span>
              )}
            </div>
            <div className={s.row}>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || invalid || !onPageChange || pagination.pageIndex === 0}
                onClick={() => onPageChange?.(pagination.pageIndex - 1)}
              >
                Previous page
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || invalid || !onPageChange || !nextAvailable}
                onClick={() => onPageChange?.(pagination.pageIndex + 1)}
              >
                Next page
              </Button>
            </div>
          </div>
        ) : (
          <p role="status" className={g.error}>
            The page numbers don’t add up. Try loading the list again.
          </p>
        ))}
      {onLoadMore && (
        <Button
          size="sm"
          className={a.local}
          variant="outline"
          disabled={loading || invalid}
          onClick={onLoadMore}
        >
          Load more rows
        </Button>
      )}
      {(rows.length > 100 || columns.length > 20) && (
        <p className={s.muted}>Preview limited to 100 rows and 20 columns.</p>
      )}
    </div>
  );
}
