import { useRef, useState } from 'react';
import {
  Button,
  EmptyState,
  EmptyStateTitle,
  EmptyStateDescription,
  Field,
  Input,
  Pagination,
  Select,
  Table,
} from '@stackunseen/ui';
import type { Account } from './data';
import { dateLabel, filterAccounts, healthOptions, money } from './data';
import { AccountDetails } from './account-details';
import s from './relay.module.css';

export function AccountTable({
  accounts,
  onSave,
  onSelect,
}: {
  accounts: readonly Account[];
  onSave: (account: Account) => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [health, setHealth] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'name' | 'renewal'>('name');
  const searchInput = useRef<HTMLInputElement>(null);
  const matches = filterAccounts(accounts, query, health).sort((a, b) =>
    a[sort].localeCompare(b[sort]),
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / 6));
  const currentPage = Math.min(page, pageCount);
  const visible = matches.slice((currentPage - 1) * 6, currentPage * 6);
  return (
    <section className={s.accounts} aria-labelledby="accounts-title">
      <div className={s.sectionHeading}>
        <div>
          <h2 id="accounts-title">
            Your accounts <span className={s.count}>{accounts.length}</span>
          </h2>
          <p>Search accounts or filter by health.</p>
        </div>
        <Select
          aria-label="Sort accounts"
          value={sort}
          onValueChange={(value) => {
            setSort(value as 'name' | 'renewal');
            setPage(1);
          }}
          options={[
            { value: 'name', label: 'Name A–Z' },
            { value: 'renewal', label: 'Renewal date' },
          ]}
        />
      </div>
      <div className={s.filters}>
        <Field label="Search accounts" className={s.search}>
          <Input
            type="search"
            ref={searchInput}
            placeholder="Search name, sector, or owner…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Health" id="health-filter">
          <Select
            id="health-filter"
            aria-label="Filter by health"
            value={health}
            onValueChange={(value) => {
              setHealth(value);
              setPage(1);
            }}
            options={[{ value: 'all', label: 'All health' }, ...healthOptions]}
          />
        </Field>
      </div>
      {matches.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No matching accounts</EmptyStateTitle>
          <EmptyStateDescription>
            Try another name or clear the health filter.
          </EmptyStateDescription>
          <Button
            variant="outline"
            onClick={() => {
              setQuery('');
              setHealth('all');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </EmptyState>
      ) : (
        <Table label="Customer accounts" className={s.accountTable}>
          <Table.Header>
            <Table.Row>
              <Table.Head>Account</Table.Head>
              <Table.Head>Health</Table.Head>
              <Table.Head>Annual value</Table.Head>
              <Table.Head>Renewal</Table.Head>
              <Table.Head>Owner</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {visible.map((account) => (
              <Table.Row key={account.id}>
                <Table.Cell>
                  <div className={s.accountCell}>
                    <span className={s.monogram} aria-hidden="true">
                      {account.name.slice(0, 1)}
                    </span>
                    <div>
                      <AccountDetails
                        account={account}
                        onSave={(updated) => {
                          onSave(updated);
                          requestAnimationFrame(() => {
                            const trigger = document.getElementById(`open-${updated.id}`);
                            (trigger ?? searchInput.current)?.focus();
                          });
                        }}
                        onSelect={onSelect}
                      />
                      <span className={s.sector}>{account.sector}</span>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span className={s.health} data-health={account.health}>
                    {account.health}
                  </span>
                </Table.Cell>
                <Table.Cell className={s.numeric}>{money(account.arr)}</Table.Cell>
                <Table.Cell>{dateLabel(account.renewal)}</Table.Cell>
                <Table.Cell>
                  <span className={s.owner}>{account.owner}</span>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      <div className={s.tableFooter}>
        <p role="status">
          {matches.length === 0
            ? '0 accounts'
            : `${(currentPage - 1) * 6 + 1}–${Math.min(currentPage * 6, matches.length)} of ${matches.length} accounts`}
        </p>
        {matches.length > 0 && (
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
        )}
      </div>
    </section>
  );
}
