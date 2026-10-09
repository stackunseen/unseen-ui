'use client';
import { useId, useRef, useState } from 'react';
import { Button, Field, Input } from '@stackunseen/ui';
import {
  Calendar,
  Combobox,
  DataGrid,
  DateRangePicker,
  FilterBar,
  ListToolbar,
  MasterDetail,
  MultiSelect,
  OrgSwitcher,
  PageHeader,
  SettingsSaveCancel,
  UnsavedGuard,
} from '@stackunseen/ui/application';
import type {
  DataGridColumn,
  DataGridSort,
  DateOnly,
  DateRange,
  SettingsSaveState,
} from '@stackunseen/ui/application';
import '@stackunseen/ui/application.css';
import s from './optional-specimen.module.css';

const choices = [
  { value: 'design', label: 'Design', description: 'Product and visual design' },
  { value: 'engineering', label: 'Engineering', description: 'Application development' },
  { value: 'support', label: 'Support', description: 'Customer support' },
  {
    value: 'archived',
    label: 'Archived team',
    disabled: true,
    disabledReason: 'This team is archived.',
  },
];
const customers = [
  { id: 'c1', name: 'Avery Chen', company: 'Northstar', status: 'Active' },
  { id: 'c2', name: 'Sam Taylor', company: 'Fieldwork', status: 'Trial' },
  { id: 'c3', name: 'Jordan Patel', company: 'Gather', status: 'Active' },
  { id: 'c4', name: 'Morgan Reed', company: 'Commonplace', status: 'Trial' },
  { id: 'c5', name: 'Alex Rivera', company: 'Workshop', status: 'Active' },
];
const columns: DataGridColumn<(typeof customers)[number]>[] = [
  { id: 'name', header: 'Name', cell: (row) => row.name, sortable: true, rowHeader: true },
  { id: 'company', header: 'Company', cell: (row) => row.company, sortable: true, hideable: true },
  { id: 'status', header: 'Status', cell: (row) => row.status, sortable: true, hideable: true },
];

const disciplines = [
  { value: 'rag', label: 'RAG', count: 12, swatch: 'hsl(20 60% 50%)' },
  { value: 'agents', label: 'Agents', count: 7, swatch: 'hsl(160 60% 40%)' },
  { value: 'evals', label: 'Evals', count: 9, swatch: 'hsl(230 60% 55%)' },
  { value: 'observability', label: 'Observability', count: 4, swatch: 'hsl(300 50% 50%)' },
];
const kinds = [
  {
    label: 'Writing',
    options: [
      { value: 'guide', label: 'Guides' },
      { value: 'report', label: 'Reports' },
    ],
  },
  {
    label: 'Code',
    options: [
      { value: 'tool', label: 'Tools' },
      { value: 'pattern', label: 'Patterns' },
    ],
  },
];
function FilterBarExample({ state }: { state: string }) {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [view, setView] = useState('latest');
  const [selected, setSelected] = useState<string[]>(['agents']);
  const [kind, setKind] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const links = state === 'URL links';
  const shown = disciplines
    .filter((item) => selected.length === 0 || selected.includes(item.value))
    .reduce((sum, item) => sum + item.count, 0);
  return (
    <FilterBar
      searchLabel="Search the journal"
      searchPlaceholder="Titles, topics, summaries"
      search={search}
      onSearchChange={setSearch}
      onSearchSubmit={() => setApplied(search.trim())}
      disabled={state === 'Disabled'}
      order={{
        label: 'Order',
        value: view,
        onValueChange: setView,
        mode: links ? 'links' : 'buttons',
        options: [
          { value: 'latest', label: 'Latest', href: '#latest' },
          { value: 'grouped', label: 'By discipline', href: '#grouped' },
        ],
      }}
      facet={{
        label: 'Discipline',
        options: links
          ? disciplines.map((item) => ({ ...item, href: `#discipline-${item.value}` }))
          : disciplines,
        selected,
        onToggle: (value) =>
          setSelected((current) =>
            current.includes(value)
              ? current.filter((item) => item !== value)
              : [...current, value],
          ),
      }}
      selects={[
        { name: 'kind', label: 'Kind', value: kind, options: kinds, onValueChange: setKind },
        {
          name: 'level',
          label: 'Level',
          value: level,
          onValueChange: setLevel,
          options: [
            { value: 'intro', label: 'Introductory' },
            { value: 'advanced', label: 'Advanced' },
          ],
        },
      ]}
      onClear={() => {
        setSearch('');
        setApplied('');
        setSelected([]);
        setKind(null);
        setLevel(null);
      }}
      summary={`${shown} of 32 entries${applied ? ` matching "${applied}"` : ''}`}
    />
  );
}

function GridExample({ state }: { state: string }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DataGridSort | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [visibility, setVisibility] = useState<Readonly<Record<string, boolean>>>({});
  const filtered = customers.filter((row) =>
    `${row.name} ${row.company} ${row.status}`.toLowerCase().includes(query.toLowerCase()),
  );
  const ordered = sort
    ? [...filtered].sort(
        (a, b) =>
          String(a[sort.columnId as 'name' | 'company' | 'status']).localeCompare(
            String(b[sort.columnId as 'name' | 'company' | 'status']),
          ) * (sort.direction === 'asc' ? 1 : -1),
      )
    : filtered;
  const rows = state === 'Empty' ? [] : ordered.slice(page * 3, page * 3 + 3);
  return (
    <DataGrid
      caption="Sample customers"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      getRowLabel={(row) => row.name}
      sort={sort}
      onSortChange={(next) => {
        setSort(next);
        setPage(0);
      }}
      filter={{
        value: query,
        label: 'Find customers',
        onValueChange: (next) => {
          setQuery(next);
          setPage(0);
        },
      }}
      pagination={{
        pageIndex: page,
        pageSize: 3,
        totalRows: state === 'Empty' ? 0 : ordered.length,
      }}
      onPageChange={setPage}
      selectedRowIds={selected}
      onSelectionChange={setSelected}
      columnVisibility={visibility}
      onColumnVisibilityChange={setVisibility}
      loading={state === 'Loading'}
      error={
        state === 'Error'
          ? 'The host could not refresh customers. The previous rows remain available.'
          : undefined
      }
    />
  );
}

export function ApplicationSpecimen({ name, state }: { name: string; state: string }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>('design');
  const [multiple, setMultiple] = useState<readonly string[]>(['design']);
  const [month, setMonth] = useState<DateOnly>('2026-10-01');
  const [date, setDate] = useState<DateOnly | null>('2026-10-05');
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState('northstar');
  const [pane, setPane] = useState<'list' | 'detail'>('list');
  const listTitle = useRef<HTMLHeadingElement>(null);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const changePane = (next: 'list' | 'detail') => {
    setPane(next);
    requestAnimationFrame(() => (next === 'list' ? listTitle : detailTitle).current?.focus());
  };
  const [draft, setDraft] = useState('Northstar');
  const [saved, setSaved] = useState('Northstar');
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState<SettingsSaveState>({ status: 'idle' });
  const disabled = state === 'Disabled';
  const status = state === 'Loading' ? 'loading' : state === 'Error' ? 'error' : 'ready';
  const options = state === 'Empty' ? [] : choices;
  let content;
  if (name === 'DataGrid') content = <GridExample state={state} />;
  else if (name === 'Combobox')
    content = (
      <Combobox
        label="Team"
        value={selected}
        onValueChange={setSelected}
        query={query}
        onQueryChange={setQuery}
        options={options}
        disabled={disabled}
        status={status}
        error="The host could not load teams."
      />
    );
  else if (name === 'MultiSelect')
    content = (
      <MultiSelect
        label="Teams"
        value={multiple}
        onValueChange={setMultiple}
        query={query}
        onQueryChange={setQuery}
        options={options}
        disabled={disabled}
        status={status}
        error="The host could not load teams."
      />
    );
  else if (name === 'Calendar') {
    const props = {
      month,
      onMonthChange: setMonth,
      locale: 'en-GB',
      today: '2026-10-05' as DateOnly,
      min: '2026-10-01' as DateOnly,
      max: '2026-12-31' as DateOnly,
      disabledDates: ['2026-10-12' as DateOnly],
      disabled,
      loading: state === 'Loading',
      error: state === 'Error' ? 'The host could not load availability.' : undefined,
    };
    content =
      state === 'Range' ? (
        <Calendar
          {...props}
          mode="range"
          value={range}
          onValueChange={setRange}
          label="Choose report dates"
        />
      ) : (
        <Calendar {...props} value={date} onValueChange={setDate} label="Choose a date" />
      );
  } else if (name === 'DateRangePicker')
    content = (
      <DateRangePicker
        label="Report period"
        value={range}
        onValueChange={setRange}
        month={month}
        onMonthChange={setMonth}
        open={open}
        onOpenChange={setOpen}
        locale="en-GB"
        min="2026-10-01"
        max="2026-12-31"
        disabled={disabled}
        loading={state === 'Loading'}
        error={state === 'Error' ? 'The host could not load availability.' : undefined}
      />
    );
  else if (name === 'PageHeader')
    content = (
      <PageHeader
        title="Customers"
        headingLevel={2}
        description="Keep your customer records up to date."
        actions={
          <Button onClick={() => setNotice('Add customer requested in this example.')}>
            Add customer
          </Button>
        }
      />
    );
  else if (name === 'OrgSwitcher')
    content = (
      <OrgSwitcher
        value={organization}
        onValueChange={setOrganization}
        disabled={disabled}
        organizations={[
          { value: 'northstar', label: 'Northstar' },
          { value: 'fieldwork', label: 'Fieldwork' },
        ]}
      />
    );
  else if (name === 'ListToolbar')
    content = (
      <ListToolbar
        searchLabel="Find customers"
        search={query}
        onSearchChange={setQuery}
        disabled={disabled}
        summary={`${customers.filter((row) => row.name.toLowerCase().includes(query.toLowerCase())).length} matching sample customers`}
        actions={
          <Button
            disabled={disabled}
            onClick={() => setNotice('Add customer requested in this example.')}
          >
            Add customer
          </Button>
        }
      />
    );
  else if (name === 'FilterBar') content = <FilterBarExample state={state} />;
  else if (name === 'MasterDetail')
    content = (
      <MasterDetail
        activePane={pane}
        listLabel="Customer list"
        detailLabel="Customer details"
        list={
          <div>
            <h2 ref={listTitle} tabIndex={-1}>
              Customers
            </h2>
            <Button variant="ghost" onClick={() => changePane('detail')}>
              Avery Chen
            </Button>
          </div>
        }
        detail={
          <div>
            <h2 ref={detailTitle} tabIndex={-1}>
              Avery Chen
            </h2>
            <p>Northstar · Active</p>
            <Button variant="outline" onClick={() => changePane('list')}>
              Back to customers
            </Button>
          </div>
        }
      />
    );
  else if (name === 'SettingsSaveCancel') {
    const fixture: SettingsSaveState =
      state === 'Pending'
        ? { status: 'pending' }
        : state === 'Rejected'
          ? { status: 'rejected', message: 'The host rejected this sample save. Review the draft.' }
          : state === 'Unknown'
            ? {
                status: 'unknown',
                message:
                  'The acknowledgement was lost. Check the original receipt before saving again.',
              }
            : saveState;
    content = (
      <form
        id={`settings-${id}`}
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(draft);
          setSaveState({ status: 'acknowledged', message: 'Saved to local example state.' });
        }}
      >
        <Field label="Organization name">
          <Input
            value={draft}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              setSaveState({ status: 'idle' });
            }}
            disabled={state === 'Pending' || state === 'Unknown'}
          />
        </Field>
        <SettingsSaveCancel
          dirty={draft !== saved || state !== 'Default'}
          state={fixture}
          form={`settings-${id}`}
          onCancel={() => {
            setDraft(saved);
            setSaveState({ status: 'idle' });
          }}
          onReconcile={() =>
            setNotice('Original sample receipt lookup requested. No mutation was resent.')
          }
        />
      </form>
    );
  } else
    content = (
      <>
        <Button onClick={() => setOpen(true)}>Leave this draft</Button>
        <UnsavedGuard
          open={open}
          onOpenChange={setOpen}
          destination="Billing"
          onKeepEditing={() => {
            setOpen(false);
            setNotice('Kept the local draft.');
          }}
          onDiscard={() => {
            setOpen(false);
            setNotice('Discarded the local draft.');
          }}
        />
      </>
    );
  return (
    <div className={s.application}>
      {content}
      <p role="status" className="generic-demo-status">
        {notice}
      </p>
    </div>
  );
}
