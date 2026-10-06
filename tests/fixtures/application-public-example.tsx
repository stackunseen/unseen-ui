'use client';
import { useState } from 'react';
import { AITheme, Button } from '@stackunseen/ui';
import {
  Calendar,
  Combobox,
  DataGrid,
  DateRangePicker,
  ListToolbar,
  MasterDetail,
  MultiSelect,
  OrgSwitcher,
  PageHeader,
  SettingsSaveCancel,
  UnsavedGuard,
} from '@stackunseen/ui/application';
import type { DataGridColumn, DateOnly, DateRange } from '@stackunseen/ui/application';
import '@stackunseen/ui/application.css';

type Row = { id: string; name: string };
const columns: DataGridColumn<Row>[] = [
  { id: 'name', header: 'Name', cell: (row) => row.name, rowHeader: true, hideable: false },
];
const options = [{ value: 'team', label: 'Team' }];

export function ApplicationPublicExample() {
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<string | null>('team');
  const [choices, setChoices] = useState<readonly string[]>([]);
  const [month, setMonth] = useState<DateOnly>('2026-10-01');
  const [date, setDate] = useState<DateOnly | null>('2026-10-05');
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [open, setOpen] = useState(false);
  const [guard, setGuard] = useState(false);
  const [org, setOrg] = useState('team');
  return (
    <AITheme appearance="dark" config={{ primary: '#7c3aed' }}>
      <PageHeader
        title="Public application example"
        headingLevel={2}
        actions={<Button onClick={() => setGuard(true)}>Leave draft</Button>}
      />
      <OrgSwitcher value={org} organizations={options} onValueChange={setOrg} />
      <ListToolbar
        searchLabel="Find records"
        search={query}
        onSearchChange={setQuery}
        summary="One sample record"
      />
      <DataGrid
        caption="Public records"
        columns={columns}
        rows={[{ id: '1', name: 'Sample' }]}
        getRowId={(row) => row.id}
      />
      <Combobox
        label="Public choice"
        options={options}
        query={query}
        onQueryChange={setQuery}
        value={choice}
        onValueChange={setChoice}
      />
      <MultiSelect
        label="Public choices"
        options={options}
        query={query}
        onQueryChange={setQuery}
        value={choices}
        onValueChange={setChoices}
      />
      <Calendar
        locale="en-GB"
        month={month}
        onMonthChange={setMonth}
        value={date}
        onValueChange={setDate}
      />
      <DateRangePicker
        locale="en-GB"
        month={month}
        onMonthChange={setMonth}
        value={range}
        onValueChange={setRange}
        open={open}
        onOpenChange={setOpen}
      />
      <MasterDetail
        activePane="list"
        listLabel="Record list"
        list="Sample"
        detailLabel="Record details"
        detail="Sample details"
      />
      <SettingsSaveCancel
        dirty
        state={{ status: 'unknown', message: 'Original receipt unavailable.' }}
        onCancel={() => {}}
        onReconcile={() => {}}
      />
      <UnsavedGuard
        open={guard}
        onOpenChange={setGuard}
        onKeepEditing={() => setGuard(false)}
        onDiscard={() => setGuard(false)}
      />
    </AITheme>
  );
}
