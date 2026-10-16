'use client';
import { Button } from '../button/button.js';
import { Checkbox } from '../checkbox/checkbox.js';
import { changeSelection, nextSort } from './data-grid-model.js';
import type { DataGridProps } from './types.js';
import s from './data-grid.module.css';

type TableProps<Row> = Pick<
  DataGridProps<Row>,
  | 'caption'
  | 'captionVisibility'
  | 'columns'
  | 'rows'
  | 'getRowId'
  | 'getRowLabel'
  | 'sort'
  | 'onSortChange'
  | 'selectedRowIds'
  | 'onSelectionChange'
  | 'isRowSelectable'
  | 'loading'
  | 'disabled'
  | 'emptyMessage'
>;

export function DataGridTable<Row>({
  caption,
  captionVisibility = 'visible',
  columns,
  rows,
  getRowId,
  getRowLabel,
  sort,
  onSortChange,
  selectedRowIds,
  onSelectionChange,
  isRowSelectable,
  loading,
  disabled,
  emptyMessage,
}: TableProps<Row>) {
  const selected = new Set(selectedRowIds);
  const selectableIds = rows.filter((row) => isRowSelectable?.(row) !== false).map(getRowId);
  const selectedOnPage = selectableIds.filter((id) => selected.has(id)).length;
  const selection = selectedRowIds !== undefined;
  const allSelected = selectableIds.length > 0 && selectedOnPage === selectableIds.length;
  const span = Math.max(1, columns.length + Number(selection));
  return (
    <table className={s.table} aria-busy={loading || undefined}>
      <caption className={s.caption} data-visibility={captionVisibility}>
        {caption}
      </caption>
      <thead>
        <tr>
          {selection && columns.length > 0 && (
            <th scope="col" className={s.selectCell}>
              <Checkbox
                aria-label="Select all selectable rows on this page"
                checked={allSelected}
                indeterminate={selectedOnPage > 0 && !allSelected}
                disabled={disabled || !onSelectionChange || selectableIds.length === 0}
                onCheckedChange={(checked) =>
                  onSelectionChange?.(changeSelection(selectedRowIds, selectableIds, checked))
                }
              />
            </th>
          )}
          {columns.map((column) => {
            const current = sort?.columnId === column.id ? sort.direction : undefined;
            const next = nextSort(sort, column.id);
            const action = !next
              ? 'Clear sorting'
              : `Sort ${next.direction === 'asc' ? 'ascending' : 'descending'}`;
            return (
              <th
                key={column.id}
                scope="col"
                data-align={column.align ?? 'start'}
                aria-sort={
                  current === 'asc' ? 'ascending' : current === 'desc' ? 'descending' : undefined
                }
              >
                {column.sortable && onSortChange ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={s.sort}
                    disabled={disabled}
                    aria-label={`${column.header}: ${action}`}
                    onClick={() => onSortChange(next)}
                  >
                    <span>{column.header}</span>
                    <span aria-hidden="true" className={s.sortMark}>
                      {current === 'asc' ? '↑' : current === 'desc' ? '↓' : '↕'}
                    </span>
                  </Button>
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {columns.length === 0 ? (
          <tr>
            <td colSpan={span} className={s.empty}>
              No columns are visible. Choose columns to show data.
            </td>
          </tr>
        ) : rows.length > 0 ? (
          rows.map((row) => {
            const id = getRowId(row);
            return (
              <tr key={id} data-selected={selected.has(id) || undefined}>
                {selection && (
                  <td className={s.selectCell}>
                    <Checkbox
                      aria-label={`Select row ${getRowLabel?.(row) ?? id}`}
                      checked={selected.has(id)}
                      disabled={disabled || !onSelectionChange || isRowSelectable?.(row) === false}
                      onCheckedChange={(checked) =>
                        onSelectionChange?.(changeSelection(selectedRowIds, [id], checked))
                      }
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const Cell = column.rowHeader ? 'th' : 'td';
                  return (
                    <Cell
                      key={column.id}
                      scope={column.rowHeader ? 'row' : undefined}
                      data-align={column.align ?? 'start'}
                    >
                      {column.cell(row)}
                    </Cell>
                  );
                })}
              </tr>
            );
          })
        ) : loading ? (
          Array.from({ length: 3 }, (_, index) => (
            <tr key={index} aria-hidden="true">
              <td colSpan={span}>
                <div className={s.skeleton} />
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={span} className={s.empty}>
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
