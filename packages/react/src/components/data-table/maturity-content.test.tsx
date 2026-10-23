import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table.js';
import type { DataTableProps, TableColumn } from './data-table.js';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const columns: TableColumn[] = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'amount', label: 'Amount', sortable: true },
];

const rows = [
  { id: 'a', cells: { name: 'Alpha', amount: 1234.5 } },
  { id: 'b', cells: { name: 'Beta', amount: 0 } },
];

describe('table maturity contracts', () => {
  it.each(['table', 'cards', 'compact'] as const)(
    '%s localizes currency, keeps paging host-owned and announces sorting',
    async (variant) => {
      const user = userEvent.setup(),
        page = vi.fn(),
        sort = vi.fn();
      render(
        <DataTable
          variant={variant}
          caption="Costs"
          columns={[
            columns[0]!,
            {
              ...columns[1]!,
              format: { kind: 'number', options: { style: 'currency', currency: 'EUR' } },
            },
          ]}
          rows={rows}
          locale="de-DE"
          pagination={{ pageIndex: 0, pageSize: 2, totalRows: 3 }}
          onPageChange={page}
          onSort={sort}
          sort={{ columnId: 'name', direction: 'asc' }}
        />,
      );
      expect(screen.getByText(/1\.234,50/)).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Next page' }));
      expect(page).toHaveBeenCalledExactlyOnceWith(1);
      expect(screen.getByText('Page 1 of 2')).toBeVisible();
      expect(screen.getByText('Rows 1–2 of 3')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Sort by Name, currently ascending' }));
      expect(sort).toHaveBeenCalledExactlyOnceWith({ columnId: 'name', direction: 'desc' });
      expect(screen.getByRole('status')).toHaveTextContent('Sorted by Name, ascending.');
    },
  );
  it.each(['table', 'compact'] as const)(
    '%s uses an empty data row instead of orphaned table headers',
    (variant) => {
      render(<DataTable variant={variant} caption="Empty table" columns={columns} rows={[]} />);
      expect(screen.getByRole('status')).toHaveTextContent('No rows to display.');
      expect(screen.getByRole('cell')).toHaveAttribute('colspan', '2');
    },
  );
  it('does not invent next-page availability or a total', async () => {
    const page = vi.fn();
    const { rerender } = render(
      <DataTable
        caption="Window"
        columns={columns}
        rows={rows}
        pagination={{ pageIndex: 1, pageSize: 2 }}
        onPageChange={page}
      />,
    );
    expect(screen.getByText('Rows 3–4 · total unknown')).toBeVisible();
    expect(screen.getByText('Next page availability unknown.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    rerender(
      <DataTable
        caption="Window"
        columns={columns}
        rows={rows}
        pagination={{ pageIndex: 1, pageSize: 2, hasNextPage: true }}
        onPageChange={page}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(page).toHaveBeenCalledExactlyOnceWith(2);
  });
  it.each([
    { pageIndex: -1, pageSize: 2 },
    { pageIndex: 0, pageSize: 101 },
    { pageIndex: 0, pageSize: 2, totalRows: 1 },
    { pageIndex: 0, pageSize: 2, totalRows: 3, hasNextPage: false },
    { pageIndex: Number.MAX_SAFE_INTEGER, pageSize: 100 },
  ])('rejects inconsistent pagination metadata %j', (pagination) => {
    render(
      <DataTable
        caption="Window"
        columns={columns}
        rows={rows}
        pagination={pagination}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('page numbers don’t add up');
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
  });
  it('retains rows while loading and prevents duplicate sort/page requests', async () => {
    const callback = vi.fn();
    render(
      <DataTable
        caption="Window"
        columns={columns}
        rows={rows}
        pagination={{ pageIndex: 0, pageSize: 2, totalRows: 3 }}
        onPageChange={callback}
        onSort={callback}
        loading
      />,
    );
    expect(screen.getByText('Alpha')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Window' })).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sort by Name' }));
    expect(callback).not.toHaveBeenCalled();
  });
  it('formats dates in UTC and rejects rollover dates or ambiguous locale strings', () => {
    render(
      <DataTable
        caption="Dates"
        columns={[{ id: 'date', label: 'Date', format: { kind: 'date' } }]}
        rows={[
          { id: 'a', cells: { date: '2026-09-30T23:30:00-02:00' } },
          { id: 'b', cells: { date: '2026-02-30' } },
          { id: 'c', cells: { date: '09/30/2026' } },
        ]}
      />,
    );
    expect(screen.getByText('Oct 1, 2026')).toBeVisible();
    expect(screen.getAllByText('Invalid date')).toHaveLength(2);
  });
  it('reports invalid locale/formatter configuration without crashing or concealing values', () => {
    render(
      <DataTable
        caption="Costs"
        locale="invalid_locale"
        columns={[
          {
            id: 'amount',
            label: 'Amount',
            format: { kind: 'number', options: { style: 'currency' } },
          },
        ]}
        rows={rows}
      />,
    );
    expect(screen.getByText('1,234.5')).toBeVisible();
    expect(screen.getByText(/Requested locale unavailable/)).toBeVisible();
    expect(screen.getByText(/Invalid format for Amount/)).toBeVisible();
  });
  it('bounds application formatting and renders it as inert text', () => {
    const formatter: NonNullable<DataTableProps['formatCell']> = (_, column) =>
      column.id === 'name' ? '<script>alert(1)</script>' : 'x'.repeat(6000);
    const { container } = render(
      <DataTable caption="Custom" columns={columns} rows={[rows[0]!]} formatCell={formatter} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>alert(1)</script>')).toBeVisible();
    expect(screen.getByText(/^x+$/).textContent).toHaveLength(5000);
  });
  it('turns a throwing application formatter into an explicit cell fallback', () => {
    render(
      <DataTable
        caption="Custom"
        columns={[columns[0]!]}
        rows={[rows[0]!]}
        formatCell={() => {
          throw new Error('bad host format');
        }}
      />,
    );
    expect(screen.getByText('Unable to format value')).toBeVisible();
  });
  it.each(['column', 'row'] as const)(
    'rejects ambiguous %s identities rather than showing conflicting data',
    (kind) => {
      render(
        <DataTable
          caption="Ambiguous"
          columns={kind === 'column' ? [columns[0]!, columns[0]!] : columns}
          rows={kind === 'row' ? [rows[0]!, rows[0]!] : rows}
        />,
      );
      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('identities must be unique');
    },
  );
});
