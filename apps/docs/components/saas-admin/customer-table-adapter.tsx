import { Button, StatusBadge } from '@stackunseen/ui';
import { DataGrid } from '@stackunseen/ui/application';
import type { DataGridColumn, DataGridPagination, DataGridSort } from '@stackunseen/ui/application';
import type { Customer } from './types';
import s from './saas-admin.module.css';

/** Customer projection of the public DataGrid. The demo host owns filtering/sorting/paging. */
export function CustomerTable({
  customers,
  selectedId,
  compact = false,
  onSelect,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  disabled = false,
}: {
  customers: readonly Customer[];
  selectedId?: string;
  compact?: boolean;
  onSelect: (id: string) => void;
  sort?: DataGridSort | null;
  onSortChange?: (value: DataGridSort | null) => void;
  pagination?: DataGridPagination;
  onPageChange?: (pageIndex: number) => void;
  disabled?: boolean;
}) {
  const columns: readonly DataGridColumn<Customer>[] = [
    {
      id: 'name',
      header: 'Customer',
      sortable: true,
      hideable: false,
      rowHeader: true,
      cell: (customer) => (
        <>
          <Button
            variant="ghost"
            className={s.recordButton}
            aria-label={`View ${customer.name}`}
            aria-current={selectedId === customer.id ? 'true' : undefined}
            disabled={disabled}
            onClick={() => onSelect(customer.id)}
          >
            {customer.name}
          </Button>
          {!compact && <span className={s.secondary}>{customer.email}</span>}
        </>
      ),
    },
    { id: 'company', header: 'Company', sortable: true, cell: (customer) => customer.company },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (customer) => (
        <StatusBadge
          state={
            customer.status === 'active'
              ? 'succeeded'
              : customer.status === 'trial'
                ? 'pending'
                : 'paused'
          }
          label={
            customer.status === 'active'
              ? 'Active'
              : customer.status === 'trial'
                ? 'Trial'
                : 'Paused'
          }
        />
      ),
    },
    {
      id: 'created',
      header: 'Created',
      sortable: true,
      cell: (customer) => <time dateTime={customer.created}>{customer.created}</time>,
    },
  ];
  return (
    <DataGrid
      caption="Customer records"
      columns={columns}
      rows={customers}
      getRowId={(customer) => customer.id}
      getRowLabel={(customer) => customer.name}
      sort={sort}
      onSortChange={onSortChange}
      columnVisibility={compact ? { company: false, created: false } : undefined}
      pagination={pagination}
      onPageChange={onPageChange}
      disabled={disabled}
    />
  );
}
