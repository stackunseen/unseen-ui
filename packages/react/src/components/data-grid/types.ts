import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface DataGridColumn<Row> {
  /** Stable, unique identifier, independent of the visible label. */
  id: string;
  header: string;
  /** Trusted application code; never pass generated JSX or evaluate model output here. */
  cell: (row: Row) => ReactNode;
  sortable?: boolean;
  /** Set false for identifying columns that must remain visible. */
  hideable?: boolean;
  align?: 'start' | 'center' | 'end';
  rowHeader?: boolean;
}

export interface DataGridSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DataGridPagination {
  /** Zero-based host page. rows already contains this page, never the full dataset. */
  pageIndex: number;
  pageSize: number;
  totalRows?: number;
  /** Only true enables Next when totalRows is unknown. */
  hasNextPage?: boolean;
}

export interface DataGridFilter {
  value: string;
  /** Request only: the host filters rows and decides whether to reset its page. */
  onValueChange?: (value: string) => void;
  label?: string;
}

export interface DataGridProps<Row> extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'dir'
> {
  dir?: 'ltr' | 'rtl';
  caption: string;
  /**
   * `hidden` keeps the caption for assistive technology but not on screen. Use it when a
   * surrounding card or section already shows the same heading.
   */
  captionVisibility?: 'visible' | 'hidden';
  columns: readonly DataGridColumn<Row>[];
  /** An application-owned page/window. No implicit sorting, filtering or truncation. */
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  /** Human-readable name for each row selection checkbox; defaults to its stable ID. */
  getRowLabel?: (row: Row) => string;
  sort?: DataGridSort | null;
  /** Cycles ascending, descending, then null. */
  onSortChange?: (sort: DataGridSort | null) => void;
  pagination?: DataGridPagination;
  onPageChange?: (pageIndex: number) => void;
  /** When present, shows controlled selection; IDs outside this page are preserved. */
  selectedRowIds?: readonly string[];
  onSelectionChange?: (selectedRowIds: readonly string[]) => void;
  isRowSelectable?: (row: Row) => boolean;
  filter?: DataGridFilter;
  /** Missing keys are visible. hideable:false columns always remain visible. */
  columnVisibility?: Readonly<Record<string, boolean>>;
  onColumnVisibilityChange?: (visibility: Readonly<Record<string, boolean>>) => void;
  /** Trusted application controls, such as actions on selected rows or retry. */
  toolbar?: ReactNode;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  emptyMessage?: string;
}
