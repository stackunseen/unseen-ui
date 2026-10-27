'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { CheckIcon } from '@radix-ui/react-icons';
import {
  AgentSteps,
  ApprovalCard,
  Button,
  Checkbox,
  EvidenceGroup,
  Field,
  Input,
  Select,
  SourceCard,
  StatusBadge,
  Switch,
  Tabs,
  ToolCall,
  UsageMeter,
} from '@stackunseen/ui';
import type { ApprovalProposal, SubmissionState } from '@stackunseen/ui';
import { DataGrid } from '@stackunseen/ui/application';
import type { DataGridColumn, DataGridSort } from '@stackunseen/ui/application';
import '@stackunseen/ui/application.css';
import { RunBoard, emptyRunBoardFilter } from '@stackunseen/ui/conversation-flow';
import type { RunBoardFilter, RunCard } from '@stackunseen/ui/conversation-flow';
import '@stackunseen/ui/conversation-flow.css';
import { proposal, source, steps, tool } from '../lib/fixtures';
import { componentHref } from '../lib/site-paths';
import { updateShowcaseTheme } from '../lib/showcase-theme';
import { HomeHeroDemo } from './home-hero-demo';
import { useSiteTheme } from './site-shell';

const colors = [
  { name: 'Blue', value: '#2563eb' },
  { name: 'Forest', value: '#167145' },
  { name: 'Rose', value: '#b82955' },
];
const now = '2026-10-15T10:10:00.000Z';
const runs: RunCard[] = [
  {
    run: { id: 'r1', attemptId: 'a1', threadId: 't1', version: 2, lifecycle: 'running' },
    title: 'Customer sync',
    agent: { id: 'ops', name: 'Ops agent' },
    heartbeatAt: '2026-10-15T10:09:30.000Z',
    updatedAt: '2026-10-15T10:09:30.000Z',
    startedAt: '2026-10-15T10:07:46.000Z',
    cost: { kind: 'estimated', value: { amount: 0.03, currency: 'USD' }, basis: 'token prices' },
  },
  {
    run: { id: 'r2', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'waiting-approval' },
    title: 'Weekly report',
    agent: { id: 'docs', name: 'Docs agent' },
    updatedAt: '2026-10-15T10:05:28.000Z',
    waitingOn: { kind: 'approval', id: 'approval-2', label: 'Post to #metrics' },
    cost: { kind: 'estimated', value: { amount: 0.11, currency: 'USD' }, basis: 'token prices' },
  },
  {
    run: { id: 'r3', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'succeeded' },
    title: 'Enrich profiles',
    agent: { id: 'ops', name: 'Ops agent' },
    updatedAt: '2026-10-15T09:48:00.000Z',
    cost: { kind: 'measured', value: { amount: 0.04, currency: 'USD' } },
  },
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

/** One real component per tile, with a footer naming it and the group it belongs to. */
function Tile({
  name,
  group,
  span,
  children,
}: {
  name: string;
  group: string;
  span?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <article className="home-tile" data-span={span} aria-label={`${name} example`}>
      <div className="home-tile-stage">{children}</div>
      <footer className="home-tile-footer">
        <span>{group}</span>
        <Link prefetch={false} href={componentHref(name)}>
          {name}
        </Link>
      </footer>
    </article>
  );
}

function AgentRuns() {
  const [filter, setFilter] = useState<RunBoardFilter>(emptyRunBoardFilter);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="home-tiles">
      <Tile name="RunBoard" group="Agents & governance" span={2}>
        <RunBoard
          runs={runs}
          now={now}
          filter={filter}
          onFilterChange={setFilter}
          selectedId={selected}
          onSelect={setSelected}
          label="Runs"
          hideLabel
        />
      </Tile>
      <Tile name="AgentSteps" group="Tools & execution">
        <AgentSteps steps={steps} />
      </Tile>
    </div>
  );
}

/** The approval never completes on its own: a click shows "sent" until the simulated server answers. */
function Approvals() {
  const [current, setCurrent] = useState<ApprovalProposal>(proposal);
  const [submission, setSubmission] = useState<SubmissionState>('idle');
  function decide(decision: 'approve' | 'reject') {
    setSubmission('submitting');
    window.setTimeout(() => {
      setCurrent((prev) => ({ ...prev, status: decision === 'approve' ? 'approved' : 'rejected' }));
      setSubmission('acknowledged');
    }, 700);
  }
  return (
    <div className="home-tiles">
      <Tile name="ApprovalCard" group="Review & permissions" span={2}>
        <ApprovalCard
          proposal={current}
          submission={submission}
          onDecision={(decision) => decide(decision)}
        />
        {submission !== 'idle' && (
          <button
            type="button"
            className="web-text-link home-tile-reset"
            onClick={() => {
              setCurrent(proposal);
              setSubmission('idle');
            }}
          >
            Reset the example
          </button>
        )}
      </Tile>
      <Tile name="ToolCall" group="Tools & execution">
        <ToolCall value={tool} />
        <ToolCall
          value={{
            ...tool,
            id: 'kb-fetch',
            name: 'kb.fetch',
            label: 'Fetch the knowledge base',
            target: 'kb.internal',
            state: 'failed',
            output: '403 forbidden',
            durationMs: 310,
          }}
        />
      </Tile>
    </div>
  );
}

function Sources() {
  const at = '2026-10-15T10:10:00.000Z';
  return (
    <div className="home-tiles">
      <Tile name="SourceCard" group="Sources & evidence">
        <SourceCard source={source} />
      </Tile>
      <Tile name="EvidenceGroup" group="Sources & evidence">
        <EvidenceGroup
          claim="Inactive accounts need an owner review before archival."
          relationships={{ policy: 'supports', ticket: 'related' }}
          sources={[
            source,
            {
              ...source,
              id: 'policy',
              title: 'Account retention policy',
              locator: 'Section 2',
              excerpt: 'Accounts under a legal hold must remain accessible.',
            },
            {
              ...source,
              id: 'ticket',
              title: 'Support ticket 4821',
              kind: 'record',
              locator: 'Closed 3 October',
              access: 'revoked',
              excerpt: undefined,
            },
          ]}
        />
      </Tile>
      <Tile name="UsageMeter" group="Context & memory">
        <UsageMeter
          label="Context"
          value={{ kind: 'measured', value: { used: 27400, limit: 32000 }, at }}
        />
        <UsageMeter
          label="Cost"
          unit="currency"
          value={{ kind: 'estimated', value: { used: 1.25, limit: 5 }, basis: 'list prices', at }}
        />
        <UsageMeter
          label="Tokens"
          value={{ kind: 'unknown', reason: 'the provider did not report usage' }}
        />
      </Tile>
    </div>
  );
}

function Forms() {
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
    <div className="home-tiles">
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
          <Checkbox label="Keep a local draft" checked={draftKept} onCheckedChange={setDraftKept} />
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
  );
}

const tabs = [
  { value: 'runs', label: 'Agent runs', content: <AgentRuns /> },
  { value: 'approvals', label: 'Approvals', content: <Approvals /> },
  { value: 'chat', label: 'Chat', content: <HomeHeroDemo /> },
  { value: 'sources', label: 'Sources', content: <Sources /> },
  { value: 'forms', label: 'Forms', content: <Forms /> },
];

/**
 * The library's breadth on the first screen: five jobs an agent product has, one tab each, every
 * tile the real component with sample props. The site's primary colour applies to all of them.
 */
export function HomeBreadth() {
  const { theme, setTheme } = useSiteTheme();
  const [tab, setTab] = useState('runs');
  return (
    <section className="home-breadth" aria-labelledby="home-breadth-title">
      <div className="home-section-heading">
        <div>
          <h2 id="home-breadth-title">The real components, with sample data.</h2>
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
            Theme Studio
          </Link>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} label="Component examples by job" items={tabs} />
    </section>
  );
}
