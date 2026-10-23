'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, ArrowTopRightIcon, CheckIcon } from '@radix-ui/react-icons';
import {
  AgentSteps,
  Button,
  Checkbox,
  Field,
  Input,
  Message,
  Select,
  StatusBadge,
  Switch,
  ToolCall,
} from '@stackunseen/ui';
import { DataGrid } from '@stackunseen/ui/application';
import type { DataGridColumn, DataGridSort } from '@stackunseen/ui/application';
import '@stackunseen/ui/application.css';
import { steps, tool } from '../lib/fixtures';
import { componentHref } from '../lib/site-paths';
import { updateShowcaseTheme } from '../lib/showcase-theme';
import { useSiteTheme } from './site-shell';

const colors = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Forest', value: '#167145' },
  { name: 'Rose', value: '#b82955' },
];
interface Check {
  id: string;
  name: string;
  duration: number;
  state: 'running' | 'succeeded';
}
const checkRows: Check[] = [
  { id: 'build', name: 'Build', duration: 67, state: 'running' },
  { id: 'search', name: 'Search tests', duration: 41, state: 'succeeded' },
  { id: 'types', name: 'Typecheck', duration: 18, state: 'succeeded' },
];
const checkColumns: readonly DataGridColumn<Check>[] = [
  { id: 'name', header: 'Check', sortable: true, rowHeader: true, cell: (row) => row.name },
  { id: 'duration', header: 'Seconds', sortable: true, align: 'end', cell: (row) => row.duration },
  { id: 'state', header: 'State', cell: (row) => <StatusBadge state={row.state} /> },
];

/** One real component per tile, with the page's theme applied to all of them at once. */
function Tile({
  name,
  group,
  span,
  children,
}: {
  name: string;
  group: string;
  span?: 2;
  children: ReactNode;
}) {
  return (
    <article className="home-tile" data-span={span} aria-label={`${name} example`}>
      <div className="home-tile-stage">{children}</div>
      <footer className="home-tile-footer">
        <span>{group}</span>
        <Link prefetch={false} href={componentHref(name)}>
          {name} <ArrowTopRightIcon width={14} height={14} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

export function HomeShowcase() {
  const { theme, setTheme } = useSiteTheme();
  const [name, setName] = useState('Acme Sandbox');
  const [region, setRegion] = useState('eu');
  const [notify, setNotify] = useState(true);
  const [draftKept, setDraftKept] = useState(true);
  const [sort, setSort] = useState<DataGridSort | null>({ columnId: 'name', direction: 'asc' });
  const rows = [...checkRows].sort((a, b) => {
    if (!sort) return 0;
    const left = a[sort.columnId as keyof Check];
    const right = b[sort.columnId as keyof Check];
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
    return sort.direction === 'asc' ? order : -order;
  });
  return (
    <section className="home-showcase" aria-labelledby="home-showcase-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-showcase-title">Try the real components here.</h2>
        </div>
        <div className="home-showcase-theme" role="group" aria-label="Site primary color">
          <span>Primary</span>
          {colors.map((color) => (
            <button
              key={color.name}
              type="button"
              aria-label={`${color.name} primary`}
              aria-pressed={theme.seeds.primary === color.value}
              onClick={() => setTheme(updateShowcaseTheme(theme, { primary: color.value }))}
            >
              <span style={{ background: color.value }}>
                {theme.seeds.primary === color.value && (
                  <CheckIcon width={12} height={12} aria-hidden="true" />
                )}
              </span>
            </button>
          ))}
          <Link prefetch={false} className="web-text-link" href="/customize/">
            Theme Studio <ArrowRightIcon width={14} height={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="home-tiles">
        <Tile name="Message" group="Conversation">
          <div className="message-exchange">
            <Message
              variant="bubble"
              value={{
                id: 'question',
                role: 'user',
                revision: 1,
                text: 'Which accounts need an owner review?',
                state: 'complete',
              }}
            />
            <Message
              value={{
                id: 'answer',
                role: 'assistant',
                revision: 1,
                text: 'Three accounts have been inactive for 90 days. Each has an owner on file.',
                state: 'complete',
              }}
            />
          </div>
        </Tile>
        <Tile name="ToolCall" group="Tools & execution">
          <ToolCall value={tool} />
        </Tile>
        <Tile name="AgentSteps" group="Tools & execution">
          <AgentSteps steps={steps.slice(0, 3)} />
        </Tile>
        <Tile name="Field" group="Forms">
          <div className="home-form-tile">
            <Field label="Workspace name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Data region">
              <Select
                value={region}
                onValueChange={setRegion}
                options={[
                  { value: 'eu', label: 'European Union' },
                  { value: 'us', label: 'United States' },
                ]}
              />
            </Field>
            <Switch label="Email notifications" checked={notify} onCheckedChange={setNotify} />
            <Checkbox
              label="Keep a local draft"
              checked={draftKept}
              onCheckedChange={setDraftKept}
            />
            <div className="home-form-actions">
              <StatusBadge
                state={draftKept ? 'succeeded' : 'idle'}
                label={draftKept ? 'Draft saved' : 'Not saved'}
              />
              <Button size="sm" variant="outline">
                Cancel
              </Button>
              <Button size="sm">Save changes</Button>
            </div>
          </div>
        </Tile>
        <Tile name="DataGrid" group="Forms & generated UI" span={2}>
          <DataGrid
            caption="Synthetic build checks"
            columns={checkColumns}
            rows={rows}
            getRowId={(row) => row.id}
            sort={sort}
            onSortChange={setSort}
          />
        </Tile>
      </div>
    </section>
  );
}
