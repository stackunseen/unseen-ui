import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataGrid } from './data-grid.js';
import type { DataGridColumn, DataGridProps } from './types.js';

interface Account {
  id: string;
  name: string;
  seats: number;
  locked?: boolean;
}
const rows: readonly Account[] = [
  { id: 'a', name: 'Arc Works', seats: 12 },
  { id: 'b', name: 'North Studio', seats: 4 },
  { id: 'c', name: 'Archived account', seats: 0, locked: true },
];
const columns: readonly DataGridColumn<Account>[] = [
  {
    id: 'name',
    header: 'Account',
    cell: (row) => row.name,
    sortable: true,
    rowHeader: true,
    hideable: false,
  },
  { id: 'seats', header: 'Seats', cell: (row) => row.seats, sortable: true, align: 'end' },
];
const base: DataGridProps<Account> = {
  caption: 'Customer accounts',
  rows,
  columns,
  getRowId: (row) => row.id,
  getRowLabel: (row) => row.name,
};

describe('DataGrid application contract', () => {
  it('renders a named semantic table, row headers and trusted interactive cells', async () => {
    const inspect = vi.fn();
    render(
      <DataGrid
        {...base}
        columns={[
          ...columns,
          {
            id: 'actions',
            header: 'Actions',
            cell: (row) => (
              <button type="button" onClick={() => inspect(row.id)}>
                Inspect {row.name}
              </button>
            ),
          },
        ]}
      />,
    );
    expect(screen.getByRole('table', { name: base.caption })).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Account' })).toHaveAttribute('scope', 'col');
    expect(screen.getByRole('rowheader', { name: 'Arc Works' })).toHaveAttribute('scope', 'row');
    const button = screen.getByRole('button', { name: 'Inspect Arc Works' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(inspect).toHaveBeenCalledWith('a');
    expect(screen.getByRole('group', { name: /table scroll area/ })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('requests a three-step sort and waits for host acknowledgement', async () => {
    const change = vi.fn();
    const { rerender } = render(<DataGrid {...base} onSortChange={change} />);
    await userEvent.click(screen.getByRole('button', { name: 'Seats: Sort ascending' }));
    expect(change).toHaveBeenLastCalledWith({ columnId: 'seats', direction: 'asc' });
    expect(screen.getByRole('button', { name: 'Seats: Sort ascending' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('table'))
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent),
    ).toEqual(rows.map((row) => row.name));
    rerender(
      <DataGrid {...base} sort={{ columnId: 'seats', direction: 'asc' }} onSortChange={change} />,
    );
    expect(screen.getByRole('columnheader', { name: /Seats/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Seats: Sort descending' }));
    expect(change).toHaveBeenLastCalledWith({ columnId: 'seats', direction: 'desc' });
    rerender(
      <DataGrid {...base} sort={{ columnId: 'seats', direction: 'desc' }} onSortChange={change} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Seats: Clear sorting' }));
    expect(change).toHaveBeenLastCalledWith(null);
  });

  it('keeps filter text and supplied rows controlled, including read-only filters', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <DataGrid
        {...base}
        filter={{ value: 'Arc', onValueChange: change, label: 'Find accounts' }}
      />,
    );
    const filter = screen.getByRole('searchbox', { name: 'Find accounts' });
    await userEvent.type(filter, 's');
    expect(change).toHaveBeenLastCalledWith('Arcs');
    expect(filter).toHaveValue('Arc');
    expect(screen.getByRole('rowheader', { name: 'North Studio' })).toBeInTheDocument();
    rerender(<DataGrid {...base} filter={{ value: 'Arc', label: 'Find accounts' }} />);
    expect(filter).toHaveAttribute('readonly');
  });

  it('selects only selectable page rows, preserves other IDs and keeps mixed state until acknowledged', async () => {
    const change = vi.fn();
    const selected = Object.freeze(['outside-page', 'a']);
    const { rerender } = render(
      <DataGrid
        {...base}
        selectedRowIds={selected}
        onSelectionChange={change}
        isRowSelectable={(row) => !row.locked}
      />,
    );
    const all = screen.getByRole('checkbox', { name: 'Select all selectable rows on this page' });
    expect(all).toBePartiallyChecked();
    expect(screen.getByRole('checkbox', { name: 'Select row Archived account' })).toBeDisabled();
    all.focus();
    await userEvent.keyboard(' ');
    expect(change).toHaveBeenLastCalledWith(['outside-page', 'a', 'b']);
    expect(all).toBePartiallyChecked();
    expect(selected).toEqual(['outside-page', 'a']);
    rerender(
      <DataGrid
        {...base}
        selectedRowIds={['outside-page', 'a', 'b', 'c']}
        onSelectionChange={change}
        isRowSelectable={(row) => !row.locked}
      />,
    );
    expect(all).toBeChecked();
    await userEvent.click(all);
    expect(change).toHaveBeenLastCalledWith(['outside-page', 'c']);
  });

  it('requests row selection without toggling cells or row controls', async () => {
    const change = vi.fn();
    render(<DataGrid {...base} selectedRowIds={['elsewhere']} onSelectionChange={change} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select row North Studio' }));
    expect(change).toHaveBeenLastCalledWith(['elsewhere', 'b']);
    expect(screen.getByRole('checkbox', { name: 'Select row North Studio' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('rowheader', { name: 'North Studio' }));
    expect(change).toHaveBeenCalledTimes(1);
  });

  it('shows immutable selection and sort with no mutation callbacks', () => {
    render(
      <DataGrid {...base} selectedRowIds={['b']} sort={{ columnId: 'seats', direction: 'desc' }} />,
    );
    expect(screen.getByRole('checkbox', { name: 'Select row North Studio' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select row North Studio' })).toBeDisabled();
    expect(screen.getByRole('columnheader', { name: 'Seats' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.queryByRole('button', { name: /Sort/ })).not.toBeInTheDocument();
  });

  it('pages already-windowed rows and never slices them again', async () => {
    const change = vi.fn();
    render(
      <DataGrid
        {...base}
        pagination={{ pageIndex: 2, pageSize: 3, totalRows: 12 }}
        onPageChange={change}
      />,
    );
    expect(screen.getByText('Rows 7–9 of 12')).toBeInTheDocument();
    expect(screen.getAllByRole('rowheader')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(change).toHaveBeenLastCalledWith(3);
    expect(screen.getByText('Page 3 of 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(change).toHaveBeenLastCalledWith(1);
  });

  it('requires explicit next-page availability for unknown totals', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <DataGrid {...base} pagination={{ pageIndex: 0, pageSize: 3 }} onPageChange={change} />,
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByText('Next page availability unknown.')).toBeInTheDocument();
    rerender(
      <DataGrid
        {...base}
        pagination={{ pageIndex: 0, pageSize: 3, hasNextPage: true }}
        onPageChange={change}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(change).toHaveBeenCalledWith(1);
  });

  it.each([
    { pageIndex: -1, pageSize: 3 },
    { pageIndex: 0, pageSize: 0 },
    { pageIndex: 0, pageSize: 2 },
    { pageIndex: 3, pageSize: 3, totalRows: 9 },
    { pageIndex: 0, pageSize: 3, totalRows: 2 },
    { pageIndex: Number.MAX_SAFE_INTEGER, pageSize: 3 },
  ])(
    'reports inconsistent pagination instead of clamping or offering navigation: %j',
    (pagination) => {
      render(<DataGrid {...base} pagination={pagination} onPageChange={vi.fn()} />);
      expect(screen.getByText(/Page information is inconsistent/)).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(screen.getAllByRole('rowheader')).toHaveLength(3);
    },
  );

  it('supports controlled visibility and retains required identifying columns', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <DataGrid {...base} columnVisibility={{ name: false }} onColumnVisibilityChange={change} />,
    );
    const trigger = screen.getByRole('button', { name: 'Columns' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Columns for Customer accounts' });
    expect(within(dialog).getByRole('checkbox', { name: 'Account Required' })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Seats' }));
    expect(change).toHaveBeenLastCalledWith({ name: false, seats: false });
    expect(screen.getByRole('columnheader', { name: 'Seats' })).toBeInTheDocument();
    rerender(
      <DataGrid
        {...base}
        columnVisibility={{ name: false, seats: false }}
        onColumnVisibilityChange={change}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Seats' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('keeps host sort visible when its column is hidden and handles no visible columns', () => {
    const { rerender } = render(
      <DataGrid
        {...base}
        columnVisibility={{ seats: false }}
        sort={{ columnId: 'seats', direction: 'asc' }}
      />,
    );
    expect(screen.getByText('Sorted by Seats, ascending.')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Seats' })).not.toBeInTheDocument();
    rerender(
      <DataGrid
        {...base}
        columns={columns.map((column) => ({ ...column, hideable: true }))}
        columnVisibility={{ name: false, seats: false }}
      />,
    );
    expect(screen.getByText(/No columns are visible/)).toBeInTheDocument();
    expect(screen.queryByRole('rowheader')).not.toBeInTheDocument();
  });

  it('preserves rows through refresh and shows initial loading, empty, filtered and error states', () => {
    const { rerender } = render(
      <DataGrid
        {...base}
        loading
        selectedRowIds={[]}
        onSelectionChange={vi.fn()}
        onSortChange={vi.fn()}
        filter={{ value: '', onValueChange: vi.fn() }}
      />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Updating rows…')).toBeInTheDocument();
    expect(screen.getAllByRole('rowheader')).toHaveLength(3);
    expect(screen.getByRole('searchbox')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /all selectable/ })).toBeDisabled();
    rerender(<DataGrid {...base} rows={[]} loading />);
    expect(screen.getByText('Loading rows…')).toBeInTheDocument();
    expect(screen.getAllByRole('row', { hidden: true })).toHaveLength(4);
    rerender(<DataGrid {...base} rows={[]} />);
    expect(screen.getByText('No rows to display.')).toBeInTheDocument();
    rerender(
      <DataGrid
        {...base}
        rows={[]}
        filter={{ value: 'missing' }}
        error="The server could not load accounts."
      />,
    );
    expect(screen.getByText('No matching rows.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The server could not load accounts.');
  });

  it('rejects duplicate identities before rendering trusted cells or enabling mutations', () => {
    const cell = vi.fn(() => 'Unsafe identity');
    render(
      <DataGrid
        {...base}
        rows={[rows[0]!, rows[0]!]}
        columns={[{ id: 'name', header: 'Account', cell }]}
        onColumnVisibilityChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Row and column identifiers must be unique',
    );
    expect(cell).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Columns' })).not.toBeInTheDocument();
  });

  it('recovers focus when a host page removes the focused rich cell', () => {
    const actionable = [
      ...columns,
      {
        id: 'action',
        header: 'Action',
        cell: (row: Account) => <button type="button">Open {row.name}</button>,
      },
    ];
    const { rerender } = render(<DataGrid {...base} columns={actionable} />);
    screen.getByRole('button', { name: 'Open Arc Works' }).focus();
    rerender(<DataGrid {...base} columns={actionable} rows={[rows[1]!]} />);
    expect(screen.getByRole('group', { name: /table scroll area/ })).toHaveFocus();
  });

  it('never steals focus from a host control on page updates', () => {
    const view = (pageRows: readonly Account[]) => (
      <>
        <button type="button">Host navigation</button>
        <DataGrid {...base} rows={pageRows} selectedRowIds={[]} onSelectionChange={vi.fn()} />
      </>
    );
    const { rerender } = render(view(rows));
    screen.getByRole('checkbox', { name: 'Select row Arc Works' }).focus();
    screen.getByRole('button', { name: 'Host navigation' }).focus();
    rerender(view([rows[1]!]));
    expect(screen.getByRole('button', { name: 'Host navigation' })).toHaveFocus();
  });

  it('renders the supplied application window without the AI DataTable preview cap', () => {
    render(
      <DataGrid
        {...base}
        rows={Array.from({ length: 105 }, (_, index) => ({
          id: String(index),
          name: `Customer ${index}`,
          seats: index,
        }))}
      />,
    );
    expect(screen.getAllByRole('rowheader')).toHaveLength(105);
    expect(screen.getByRole('rowheader', { name: 'Customer 104' })).toBeInTheDocument();
  });
});
