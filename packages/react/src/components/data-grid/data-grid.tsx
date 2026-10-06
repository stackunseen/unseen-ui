'use client';
import { useEffect, useRef } from 'react';
import { DataGridToolbar, DataGridPaging } from './data-grid-controls.js';
import { DataGridTable } from './data-grid-table.js';
import { validIds } from './data-grid-model.js';
import type { DataGridProps } from './types.js';
import s from './data-grid.module.css';

/** Optional application table. The host owns rows and all data operations. */
export function DataGrid<Row>({
  caption,
  columns,
  rows,
  getRowId,
  getRowLabel,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  selectedRowIds,
  onSelectionChange,
  isRowSelectable,
  filter,
  columnVisibility,
  onColumnVisibilityChange,
  toolbar,
  loading = false,
  error,
  disabled = false,
  emptyMessage,
  className = '',
  dir,
  onFocusCapture,
  onBlurCapture,
  ...props
}: DataGridProps<Row>) {
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const focused = useRef<HTMLElement | null>(null);
  const valid = validIds(columns.map((column) => column.id)) && validIds(rows.map(getRowId));
  const shownColumns = columns.filter(
    (column) => column.hideable === false || columnVisibility?.[column.id] !== false,
  );
  const locked = disabled || loading || !valid;
  const selectedOnPage = rows.filter((row) => selectedRowIds?.includes(getRowId(row))).length;
  const sortedColumn = sort && columns.find((column) => column.id === sort.columnId);
  // A host page/visibility update may remove the focused cell. Recover only when
  // focus fell back to the document; never steal focus from another host control.
  useEffect(() => {
    const previous = focused.current;
    const document = root.current?.ownerDocument;
    if (
      previous &&
      !root.current?.contains(previous) &&
      document &&
      document.activeElement === document.body
    ) {
      scroll.current?.focus();
      focused.current = scroll.current;
    }
  }, [rows, columns, columnVisibility]);
  return (
    <div
      {...props}
      ref={root}
      dir={dir}
      className={`${s.root} ${className}`}
      onFocusCapture={(event) => {
        focused.current = event.target as HTMLElement;
        onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          focused.current = null;
        onBlurCapture?.(event);
      }}
    >
      <DataGridToolbar
        caption={caption}
        columns={valid ? columns : []}
        filter={filter}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
        toolbar={toolbar}
        disabled={locked}
        dir={dir}
      />
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {!valid && (
        <p role="alert" className={s.error}>
          Row and column identifiers must be unique and non-empty.
        </p>
      )}
      <div
        ref={scroll}
        className={s.scroll}
        role="group"
        aria-label={`${caption} table scroll area`}
        tabIndex={0}
      >
        <DataGridTable
          caption={caption}
          columns={valid ? shownColumns : []}
          rows={valid ? rows : []}
          getRowId={getRowId}
          getRowLabel={getRowLabel}
          sort={sort}
          onSortChange={onSortChange}
          selectedRowIds={selectedRowIds}
          onSelectionChange={onSelectionChange}
          isRowSelectable={isRowSelectable}
          loading={loading}
          disabled={locked}
          emptyMessage={
            emptyMessage ?? (filter?.value ? 'No matching rows.' : 'No rows to display.')
          }
        />
      </div>
      <div className={s.summary} role="status" aria-live="polite" aria-atomic="true">
        {loading && <span>{rows.length ? 'Updating rows…' : 'Loading rows…'}</span>}
        {selectedRowIds !== undefined && (
          <span>
            {new Set(selectedRowIds).size} selected · {selectedOnPage} on this page
          </span>
        )}
        {sort && (
          <span>
            {sortedColumn
              ? `Sorted by ${sortedColumn.header}, ${sort.direction === 'asc' ? 'ascending' : 'descending'}.`
              : 'The sort column is unavailable.'}
          </span>
        )}
      </div>
      <DataGridPaging
        caption={caption}
        pagination={pagination}
        onPageChange={onPageChange}
        rowCount={rows.length}
        disabled={locked}
      />
    </div>
  );
}
