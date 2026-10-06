'use client';
import { useId } from 'react';
import { Button } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { Input } from '../input/input.js';
import { Popover } from '../popover/popover.js';
import { pageState } from './data-grid-model.js';
import type { DataGridProps } from './types.js';
import s from './data-grid.module.css';

type ToolbarProps<Row> = Pick<
  DataGridProps<Row>,
  | 'caption'
  | 'columns'
  | 'filter'
  | 'columnVisibility'
  | 'onColumnVisibilityChange'
  | 'toolbar'
  | 'disabled'
  | 'dir'
>;

export function DataGridToolbar<Row>({
  caption,
  columns,
  filter,
  columnVisibility,
  onColumnVisibilityChange,
  toolbar,
  disabled,
  dir,
}: ToolbarProps<Row>) {
  const filterId = useId();
  const canChooseColumns = !!onColumnVisibilityChange && columns.some((c) => c.hideable !== false);
  if (!filter && !canChooseColumns && toolbar == null) return null;
  return (
    <div className={s.toolbar} role="group" aria-label={`Controls for ${caption}`}>
      {filter && (
        <div className={s.filter}>
          <label htmlFor={filterId}>{filter.label ?? 'Filter rows'}</label>
          <Input
            id={filterId}
            type="search"
            value={filter.value}
            readOnly={!filter.onValueChange}
            disabled={disabled}
            onChange={(event) => filter.onValueChange?.(event.currentTarget.value)}
          />
        </div>
      )}
      <div className={s.actions}>
        {toolbar}
        {canChooseColumns && (
          <Popover dir={dir}>
            <Popover.Trigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                Columns
              </Button>
            </Popover.Trigger>
            <Popover.Content title={`Columns for ${caption}`} headingLevel={3} dir={dir}>
              <div className={s.columnChoices}>
                {columns.map((column) => (
                  <label key={column.id} className={s.columnChoice}>
                    <Checkbox
                      checked={column.hideable === false || columnVisibility?.[column.id] !== false}
                      disabled={disabled || column.hideable === false}
                      onCheckedChange={(checked) =>
                        onColumnVisibilityChange?.({ ...columnVisibility, [column.id]: checked })
                      }
                    />
                    <span>{column.header}</span>
                    {column.hideable === false && <span className={s.muted}>Required</span>}
                  </label>
                ))}
              </div>
            </Popover.Content>
          </Popover>
        )}
      </div>
    </div>
  );
}

type PagingProps<Row> = Pick<
  DataGridProps<Row>,
  'caption' | 'pagination' | 'onPageChange' | 'disabled'
> & {
  rowCount: number;
};

export function DataGridPaging<Row>({
  caption,
  pagination,
  onPageChange,
  disabled,
  rowCount,
}: PagingProps<Row>) {
  if (!pagination) return null;
  const { valid, start, pageCount, hasNext } = pageState(pagination, rowCount);
  if (!valid)
    return (
      <p role="status" className={s.error}>
        Page information is inconsistent. Check the supplied rows and totals.
      </p>
    );
  return (
    <nav className={s.paging} aria-label={`Pagination for ${caption}`}>
      <div className={s.pageSummary}>
        <span>
          Page {pagination.pageIndex + 1}
          {pageCount ? ` of ${pageCount}` : ''}
        </span>
        <span className={s.muted}>
          {rowCount ? `Rows ${start + 1}–${start + rowCount}` : 'No rows on this page'}
          {pagination.totalRows === undefined ? ' · Total unknown' : ` of ${pagination.totalRows}`}
        </span>
        {pagination.totalRows === undefined && pagination.hasNextPage === undefined && (
          <span className={s.muted}>Next page availability unknown.</span>
        )}
      </div>
      <div className={s.actions}>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !onPageChange || pagination.pageIndex === 0}
          onClick={() => onPageChange?.(pagination.pageIndex - 1)}
        >
          Previous page
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !onPageChange || !hasNext}
          onClick={() => onPageChange?.(pagination.pageIndex + 1)}
        >
          Next page
        </Button>
      </div>
    </nav>
  );
}
