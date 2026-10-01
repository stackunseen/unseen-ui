import type { ComponentProps } from 'react';
import s from '../../shared/styles/surfaces.module.css';

export interface TableProps extends Omit<ComponentProps<'table'>, 'aria-label'> {
  /** Names the table independently of its optional visible caption. */
  label: string;
  /** Names the keyboard-scrollable container. */
  scrollLabel?: string;
}
export type TableCaptionProps = ComponentProps<'caption'>;
export type TableHeaderProps = ComponentProps<'thead'>;
export type TableBodyProps = ComponentProps<'tbody'>;
export type TableFooterProps = ComponentProps<'tfoot'>;
export type TableRowProps = ComponentProps<'tr'>;
export type TableHeadProps = ComponentProps<'th'>;
export type TableCellProps = ComponentProps<'td'>;

/** Native table semantics; sorting, selection and host data remain explicit children/props. */
function TableRoot({ label, scrollLabel, className = '', dir, ...props }: TableProps) {
  return (
    <div
      className={s.tableScroll}
      role="region"
      aria-label={scrollLabel ?? `${label} table scroll area`}
      tabIndex={0}
      dir={dir}
    >
      <table {...props} dir={dir} aria-label={label} className={`${s.table} ${className}`} />
    </div>
  );
}
export function TableCaption({ className = '', ...props }: TableCaptionProps) {
  return <caption {...props} className={`${s.caption} ${className}`} />;
}
export function TableHeader(props: TableHeaderProps) {
  return <thead {...props} />;
}
export function TableBody(props: TableBodyProps) {
  return <tbody {...props} />;
}
export function TableFooter(props: TableFooterProps) {
  return <tfoot {...props} />;
}
export function TableRow(props: TableRowProps) {
  return <tr {...props} />;
}
export function TableHead({ scope = 'col', ...props }: TableHeadProps) {
  return <th {...props} scope={scope} />;
}
export function TableCell(props: TableCellProps) {
  return <td {...props} />;
}

export const Table = Object.assign(TableRoot, {
  Root: TableRoot,
  Caption: TableCaption,
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
});
