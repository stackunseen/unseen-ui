'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { CheckIcon } from '@radix-ui/react-icons';
import {
  AgentSteps,
  ApprovalCard,
  BarList,
  Button,
  Chart,
  Checkbox,
  DonutChart,
  DotBars,
  EvidenceGroup,
  Field,
  Input,
  Select,
  SourceCard,
  Sparkline,
  Stat,
  StatusBadge,
  Switch,
  Tabs,
  ToolCall,
  Tracker,
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

// Fixed figures for the Dashboards tab, so the page and its screenshots repeat.
const latencyDays = [212, 198, 230, 245, 221, 190, 176, 182, 169, 158, 166, 149, 141, 152].map(
  (value, index) => ({ label: `Oct ${index + 1}`, value }),
);
const runDays = [41, 38, 44, 52, 47, 30, 28, 55, 61, 58, 63, 49, 36, 66].map((value, index) => ({
  label: `Oct ${index + 1}`,
  value,
}));
const evalDays = Array.from({ length: 30 }, (_, index) => ({
  label: `Day ${index + 1}`,
  status: ([11, 23].includes(index) ? 'failed' : [5, 17].includes(index) ? 'degraded' : 'ok') as
    'ok' | 'failed' | 'degraded',
}));

const requestDays = ['Oct 21', 'Oct 22', 'Oct 23', 'Oct 24', 'Oct 25', 'Oct 26', 'Oct 27'];
const requestSeries = [
  { id: 'pro', label: 'atlas-pro', values: [310, 342, 365, 398, 240, 212, 401] },
  { id: 'fast', label: 'atlas-fast', values: [820, 864, 902, 951, 612, 540, 1004] },
].map((series) => ({
  id: series.id,
  label: series.label,
  points: series.values.map((value, index) => ({ label: requestDays[index]!, value })),
}));
const octoberRuns = [
  12, 14, 11, 9, 16, 4, 3, 22, 26, 31, 28, 24, 6, 5, 30, 34, 29, 38, 41, 36, 9, 7, 33, 35, 32, 30,
  27, 8, 6, 25, 23,
].map((value, day) => ({ label: `Oct ${day + 1}`, value }));
const kpis = [
  {
    label: 'Runs today',
    value: '66',
    delta: '+14%',
    trend: 'up' as const,
    data: runDays,
    variant: 'bar' as const,
  },
  {
    label: 'Success rate',
    value: '97.4%',
    delta: '+0.6 pt',
    trend: 'up' as const,
    data: [95.1, 95.8, 96.2, 95.4, 96.9, 97.1, 96.8, 97.4].map((value, index) => ({
      label: `Day ${index + 1}`,
      value,
    })),
    variant: 'line' as const,
  },
  {
    label: 'p95 latency',
    value: '152 ms',
    delta: '-28%',
    trend: 'neutral' as const,
    data: latencyDays,
    variant: 'area' as const,
  },
  {
    label: 'Spend today',
    value: '$41.20',
    delta: '+$3.10',
    trend: 'neutral' as const,
    data: [31, 34, 29, 38, 36, 41, 38, 41].map((value, index) => ({
      label: `Day ${index + 1}`,
      value,
    })),
    variant: 'line' as const,
  },
];

const dashboardAt = '2026-10-27T10:10:00.000Z';

function Dashboards() {
  return (
    <div className="home-tiles home-dashboard">
      <Tile name="Sparkline" group="Data display" span={3}>
        <div className="home-kpis">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="home-kpi">
              <Stat
                variant="plain"
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                trend={kpi.trend}
              />
              <Sparkline
                label={`${kpi.label}, recent days`}
                data={kpi.data}
                variant={kpi.variant}
                markLast={kpi.variant !== 'bar'}
              />
            </div>
          ))}
        </div>
      </Tile>
      <Tile name="Chart" group="Data display" span={2}>
        <Chart
          title="Requests by model"
          series={requestSeries}
          unit="requests"
          source="metrics service"
          variant="bar"
          showLegend
        />
      </Tile>
      <Tile name="DonutChart" group="Data display">
        <DonutChart
          label="Spend by model, October"
          unit="USD"
          value="$1,284"
          caption="this month"
          data={[
            { id: 'pro', label: 'atlas-pro', value: 742 },
            { id: 'fast', label: 'atlas-fast', value: 318 },
            { id: 'embed', label: 'embeddings', value: 164 },
            { id: 'other', label: 'Other', value: 60 },
          ]}
        />
      </Tile>
      <Tile name="Tracker" group="Data display" span={2}>
        <div className="home-dashboard-stack">
          <Tracker
            label="Nightly eval runs, last 30 days"
            segments={evalDays}
            summary="28 of 30 passed"
            axis={['30 days ago', 'Today']}
          />
          <DotBars
            label="Runs per day in October"
            unit="runs"
            data={octoberRuns}
            range={{ start: 14, end: 19 }}
            rangeLabel="Oct 15 – 20, 208 runs"
            axis={['Oct 1', 'Oct 31']}
          />
        </div>
      </Tile>
      <Tile name="BarList" group="Data display">
        <BarList
          label="Tool calls by tool"
          headings={['Tool', 'Calls']}
          items={[
            { id: 'search', label: 'search_docs', value: 1240, display: '1,240' },
            { id: 'read', label: 'read_file', value: 860, display: '860' },
            { id: 'sql', label: 'run_query', value: 412, display: '412' },
            { id: 'mail', label: 'send_email', value: 96, display: '96' },
            { id: 'deploy', label: 'deploy_preview', value: 31, display: '31' },
          ]}
        />
      </Tile>
      <Tile name="UsageMeter" group="Context & memory" span={3}>
        <div className="home-meters">
          <UsageMeter
            variant="detail"
            label="Monthly budget"
            unit="currency"
            value={{
              kind: 'measured',
              value: { used: 1284, limit: 2000 },
              at: dashboardAt,
            }}
          />
          <UsageMeter
            variant="detail"
            label="Context window"
            value={{ kind: 'measured', value: { used: 27400, limit: 32000 }, at: dashboardAt }}
          />
          <UsageMeter
            variant="detail"
            label="Requests this minute"
            unit="count"
            value={{
              kind: 'estimated',
              value: { used: 410, limit: 600 },
              basis: 'last minute',
              at: dashboardAt,
            }}
          />
        </div>
      </Tile>
    </div>
  );
}

const tabs = [
  { value: 'runs', label: 'Agent runs', content: <AgentRuns /> },
  { value: 'approvals', label: 'Approvals', content: <Approvals /> },
  { value: 'dashboards', label: 'Dashboards', content: <Dashboards /> },
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
