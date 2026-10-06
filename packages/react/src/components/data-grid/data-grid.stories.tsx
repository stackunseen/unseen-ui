import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Button } from '../button/button.js';
import { DataGrid } from './data-grid.js';
import type { DataGridColumn, DataGridSort } from './types.js';

interface Customer {
  id: string;
  name: string;
  owner: string;
  seats: number;
  archived?: boolean;
}
const customers: readonly Customer[] = [
  { id: 'arc', name: 'Arc Works', owner: 'Mina Park', seats: 24 },
  { id: 'north', name: 'North Studio', owner: 'Jonas Reed', seats: 8 },
  { id: 'field', name: 'Field Research Cooperative', owner: 'Avery Ellis', seats: 16 },
  { id: 'shore', name: 'Shore Labs', owner: 'Sam Patel', seats: 40 },
  { id: 'old', name: 'Archived test workspace', owner: 'Casey Liu', seats: 0, archived: true },
];
const columns: readonly DataGridColumn<Customer>[] = [
  {
    id: 'name',
    header: 'Customer',
    cell: (row) => row.name,
    sortable: true,
    rowHeader: true,
    hideable: false,
  },
  { id: 'owner', header: 'Owner', cell: (row) => row.owner },
  { id: 'seats', header: 'Seats', cell: (row) => row.seats, align: 'end', sortable: true },
  { id: 'state', header: 'State', cell: (row) => (row.archived ? 'Archived' : 'Active') },
];
type DemoProps = {
  dark?: boolean;
  narrow?: boolean;
  loading?: boolean;
  empty?: boolean;
  error?: string;
  rtl?: boolean;
};

function CustomerDemo({ dark, narrow, loading, empty, error, rtl }: DemoProps) {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<DataGridSort | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [visibility, setVisibility] = useState<Readonly<Record<string, boolean>>>({});
  const [inspecting, setInspecting] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const matching = (empty ? [] : customers).filter((row) =>
      row.name.toLowerCase().includes(filter.toLowerCase()),
    );
    if (!sort) return matching;
    return [...matching].sort((a, b) => {
      const difference =
        sort.columnId === 'seats' ? a.seats - b.seats : a.name.localeCompare(b.name);
      return difference * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [filter, sort, empty]);
  const pageSize = 3;
  return (
    <AITheme
      appearance={dark ? 'dark' : 'light'}
      dir={rtl ? 'rtl' : 'ltr'}
      style={{ maxWidth: narrow ? 320 : 960 }}
    >
      <DataGrid
        caption="Customer workspaces"
        columns={[
          ...columns,
          {
            id: 'actions',
            header: 'Actions',
            cell: (row) => (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Inspect ${row.name}`}
                onClick={() => setInspecting(row.name)}
              >
                Inspect
              </Button>
            ),
          },
        ]}
        rows={filtered.slice(page * pageSize, (page + 1) * pageSize)}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        filter={{
          value: filter,
          label: 'Find customers',
          onValueChange: (value) => {
            setFilter(value);
            setPage(0);
          },
        }}
        sort={sort}
        onSortChange={(value) => {
          setSort(value);
          setPage(0);
        }}
        pagination={{ pageIndex: page, pageSize, totalRows: filtered.length }}
        onPageChange={setPage}
        selectedRowIds={selected}
        onSelectionChange={setSelected}
        isRowSelectable={(row) => !row.archived}
        columnVisibility={visibility}
        onColumnVisibilityChange={setVisibility}
        loading={loading}
        error={error}
      />
      {inspecting && (
        <p role="status">Inspecting {inspecting}. This story uses local customer records.</p>
      )}
    </AITheme>
  );
}

const meta = {
  title: 'Unseen UI/Application/DataGrid',
  component: CustomerDemo,
  parameters: { layout: 'padded' },
  args: { dark: false, narrow: false, loading: false, empty: false, rtl: false },
} satisfies Meta<typeof CustomerDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Controlled: Story = {};
export const Dark: Story = { args: { dark: true } };
export const Narrow: Story = { args: { narrow: true } };
export const RightToLeft: Story = { args: { rtl: true } };
export const Refreshing: Story = { args: { loading: true } };
export const Empty: Story = { args: { empty: true } };
export const Loading: Story = { args: { empty: true, loading: true } };
export const Error: Story = {
  args: { error: 'Customer records are temporarily unavailable. The previous page is retained.' },
};
