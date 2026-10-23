import type { ReactNode } from 'react';
import type { DataGridSort } from '@stackunseen/ui/application';
import { Button, Field, Select } from '@stackunseen/ui';
import { CustomerTable } from './customer-table-adapter';
import { CustomerDetail } from './customer-detail';
import { ListToolbar, MasterDetail, PageHeader } from './pattern-adapter';
import { statusOptions } from './options';
import type { Customer, DemoOrganization } from './types';
import s from './saas-admin.module.css';

export function CustomersScreen({
  organization,
  selected,
  creating,
  editing,
  editor,
  query,
  status,
  sort,
  page,
  onQuery,
  onStatus,
  onSort,
  onPage,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onBack,
  disabled,
}: {
  organization: DemoOrganization;
  selected?: Customer;
  creating: boolean;
  editing: boolean;
  editor?: ReactNode;
  query: string;
  status: string;
  sort: DataGridSort | null;
  page: number;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (value: DataGridSort | null) => void;
  onPage: (value: number) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  disabled: boolean;
}) {
  const matches = organization.customers
    .filter(
      (customer) =>
        (status === 'all' || customer.status === status) &&
        `${customer.name} ${customer.email} ${customer.company}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (!sort) return 0;
      const column = sort.columnId as 'name' | 'company' | 'status' | 'created';
      return (a[column] ?? '').localeCompare(b[column] ?? '') * (sort.direction === 'asc' ? 1 : -1);
    });
  const list = (
    <div className={s.stack}>
      <ListToolbar
        searchLabel="Search customers"
        search={query}
        searchPlaceholder="Name, email or company"
        onSearchChange={onQuery}
        disabled={disabled}
        filters={
          <>
            <Field label="Status filter" labelAs="span">
              <Select
                aria-label="Status filter"
                value={status}
                options={[{ value: 'all', label: 'All statuses' }, ...statusOptions]}
                disabled={disabled}
                onValueChange={onStatus}
              />
            </Field>
          </>
        }
        summary={`${matches.length} of ${organization.customers.length} customers`}
      />
      {matches.length ? (
        <>
          <CustomerTable
            customers={matches.slice((page - 1) * 5, page * 5)}
            selectedId={selected?.id}
            compact={Boolean(selected)}
            onSelect={onSelect}
            sort={sort}
            onSortChange={onSort}
            pagination={{ pageIndex: page - 1, pageSize: 5, totalRows: matches.length }}
            onPageChange={(value) => onPage(value + 1)}
            disabled={disabled}
          />
        </>
      ) : (
        <div className={s.empty}>
          <h3>No customers found</h3>
          <p>Try a different name, company or status.</p>
          <Button
            variant="outline"
            onClick={() => {
              onQuery('');
              onStatus('all');
            }}
            disabled={disabled}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
  return (
    <div className={s.stack}>
      <PageHeader
        headingLevel={2}
        title={creating ? 'Create customer' : editing ? 'Edit customer' : 'Customers'}
        description={
          creating
            ? 'Add a record to this local organization.'
            : editing
              ? 'Changes stay in your draft until the local server acknowledges them.'
              : 'Search, inspect and update the people you work with.'
        }
        actions={
          !creating && !editing ? (
            <Button onClick={onCreate} disabled={disabled}>
              Create customer
            </Button>
          ) : (
            <Button variant="ghost" onClick={onBack} disabled={disabled}>
              Back to customers
            </Button>
          )
        }
      />
      {creating || editing ? (
        <section className={s.panel} aria-label="Customer editor">
          {editor}
        </section>
      ) : selected ? (
        <MasterDetail
          listLabel="Customer list"
          list={list}
          detailLabel="Customer details"
          activePane="detail"
          detail={
            <div className={s.panel}>
              <CustomerDetail
                customer={selected}
                onEdit={onEdit}
                onDelete={onDelete}
                onBack={onBack}
                disabled={disabled}
              />
            </div>
          }
        />
      ) : (
        list
      )}
    </div>
  );
}
