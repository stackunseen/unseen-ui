'use client';
import { useState } from 'react';
import { Chart, ContextWindowMeter, Select, Stat, StatusBadge } from '@stackunseen/ui';
import { DataGrid, PageHeader } from '@stackunseen/ui/application';
import type { DataGridColumn, DataGridSort } from '@stackunseen/ui/application';
import { CostLedger } from '@stackunseen/ui/conversation-flow';
import s from './screens.module.css';

const days = ['21 Oct', '22 Oct', '23 Oct', '24 Oct', '25 Oct', '26 Oct', '27 Oct'];
const requestsByModel = [
  { id: 'opus', label: 'Opus 5.5', points: [310, 290, 340, 360, 220, 180, 410] },
  { id: 'sonnet', label: 'Sonnet 5.5', points: [820, 870, 910, 940, 610, 540, 1020] },
  { id: 'haiku', label: 'Haiku 5.5', points: [1900, 2100, 2050, 2300, 1400, 1200, 2450] },
].map((series) => ({
  ...series,
  points: series.points.map((value, index) => ({ label: days[index]!, value })),
}));
const latency = days.map((label, index) => ({ label, value: [1.8, 1.9, 2.4, 2.1, 1.7, 1.6, 2.2][index]! }));
interface ToolRow {
  id: string;
  tool: string;
  calls: number;
  failed: number;
  p95: number;
  state: 'succeeded' | 'failed' | 'running';
}
const tools: ToolRow[] = [
  { id: 't1', tool: 'search_orders', calls: 4120, failed: 12, p95: 640, state: 'succeeded' },
  { id: 't2', tool: 'payments.refunds.preview', calls: 380, failed: 0, p95: 1210, state: 'succeeded' },
  { id: 't3', tool: 'kb.fetch', calls: 2210, failed: 96, p95: 880, state: 'failed' },
  { id: 't4', tool: 'translate.glossary', calls: 960, failed: 3, p95: 410, state: 'succeeded' },
  { id: 't5', tool: 'images.resize', calls: 2140, failed: 1460, p95: 2900, state: 'failed' },
];
const toolColumns: readonly DataGridColumn<ToolRow>[] = [
  { id: 'tool', header: 'Tool', sortable: true, rowHeader: true, cell: (row) => <code>{row.tool}</code> },
  { id: 'calls', header: 'Calls', sortable: true, align: 'end', cell: (row) => row.calls.toLocaleString('en-US') },
  {
    id: 'failed',
    header: 'Failure rate',
    sortable: true,
    align: 'end',
    cell: (row) => `${((row.failed / row.calls) * 100).toFixed(1)}%`,
  },
  { id: 'p95', header: 'p95', sortable: true, align: 'end', cell: (row) => `${row.p95} ms` },
  {
    id: 'state',
    header: 'Last hour',
    cell: (row) => <StatusBadge state={row.state} label={row.state === 'failed' ? 'Failing' : 'Healthy'} />,
  },
];
const usd = (amount: number) => ({ amount, currency: 'USD' });

/**
 * A usage analytics screen for an agent product: requests, latency, tool health, spend per agent
 * and how full the context window runs. All figures are sample data in the shape a metrics
 * service would return, with their measurement meaning kept.
 */
export function AnalyticsScreen() {
  const [period, setPeriod] = useState('7d');
  const [sort, setSort] = useState<DataGridSort | null>({ columnId: 'calls', direction: 'desc' });
  const [notice, setNotice] = useState('');
  const rows = [...tools].sort((a, b) => {
    if (!sort) return 0;
    const left = a[sort.columnId as keyof ToolRow];
    const right = b[sort.columnId as keyof ToolRow];
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
    return sort.direction === 'asc' ? order : -order;
  });
  return (
    <div className={s.screen} data-template="analytics">
      <PageHeader
        headingLevel={2}
        title="Analytics"
        description="What the agents did this week: requests, latency, tool health and spend. Figures come from the metrics service with their meaning attached."
        actions={
          <label className={s.toolbar}>
            <span>Period</span>
            <Select
              value={period}
              onValueChange={setPeriod}
              options={[
                { value: '24h', label: 'Last 24 hours' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
              ]}
            />
          </label>
        }
      />
      <div className={s.stats}>
        <Stat label="Requests" value="23,480" delta="+12% on the week before" trend="up" note="Measured, 7 days" />
        <Stat label="Tokens" value="41.2M" delta="+9%" trend="up" note="Input and output, measured" />
        <Stat label="Spend" value="$318.40" delta="+4%" trend="up" note="Measured by billing; estimates excluded" />
        <Stat label="p95 latency" value="2.2 s" delta="+0.4 s" trend="down" note="First token, 7-day p95" />
      </div>
      <div className={s.grid}>
        <section className={`${s.panel} ${s.wide}`} aria-labelledby="analytics-requests">
          <div className={s.panelHead}>
            <h2 id="analytics-requests">Requests per day by model</h2>
            <span>{period === '24h' ? 'Hourly' : 'Daily'}, measured</span>
          </div>
          <Chart
            variant="bar"
            title="Requests by model"
            series={requestsByModel}
            unit="requests"
            source="metrics service"
            asOf="2026-10-27T08:00:00Z"
          />
        </section>
        <section className={`${s.panel} ${s.side}`} aria-labelledby="analytics-latency">
          <div className={s.panelHead}>
            <h2 id="analytics-latency">Time to first token</h2>
            <span>p95, seconds</span>
          </div>
          <Chart
            variant="line"
            title="p95 latency"
            points={latency}
            unit="s"
            source="metrics service"
            asOf="2026-10-27T08:00:00Z"
          />
        </section>
        <section className={`${s.panel} ${s.wide}`} aria-labelledby="analytics-tools">
          <div className={s.panelHead}>
            <h2 id="analytics-tools">Tool health</h2>
            <span>Calls and failures over the period</span>
          </div>
          <DataGrid
            caption="Tool calls"
            columns={toolColumns}
            rows={rows}
            getRowId={(row) => row.id}
            sort={sort}
            onSortChange={setSort}
          />
        </section>
        <section className={`${s.panel} ${s.side}`} aria-labelledby="analytics-context">
          <div className={s.panelHead}>
            <h2 id="analytics-context">Context window, median request</h2>
          </div>
          <ContextWindowMeter
            variant="detail"
            value={{
              kind: 'measured',
              value: {
                segments: [
                  { id: 'system', label: 'System prompt', tokens: 2100 },
                  { id: 'memory', label: 'Memories', tokens: 700 },
                  { id: 'tools', label: 'Tool results', tokens: 9800 },
                  { id: 'messages', label: 'Messages', tokens: 4300 },
                ],
                limit: 32000,
              },
              at: '2026-10-27T08:00:00Z',
            }}
          />
          <p className={s.note}>Tool results take the most room. Trimming kb.fetch output would free about a quarter of the window.</p>
        </section>
        <section className={`${s.panel} ${s.full}`} aria-labelledby="analytics-spend">
          <div className={s.panelHead}>
            <h2 id="analytics-spend">Spend by agent</h2>
            <span>Measured and estimated kept apart</span>
          </div>
          <CostLedger
            period="last 7 days"
            rows={[
              { id: 'support', title: 'Support agent', agent: 'Support', model: 'Sonnet 5.5', tokens: { kind: 'measured', value: 18_400_000 }, cost: { kind: 'measured', value: usd(141.2) } },
              { id: 'orders', title: 'Orders agent', agent: 'Orders', model: 'Opus 5.5', tokens: { kind: 'measured', value: 6_100_000 }, cost: { kind: 'measured', value: usd(98.6) } },
              { id: 'translator', title: 'Translator', agent: 'Translator', model: 'Sonnet 5.5', tokens: { kind: 'measured', value: 11_900_000 }, cost: { kind: 'measured', value: usd(61.4) } },
              { id: 'media', title: 'Media agent', agent: 'Media', model: 'Haiku 5.5', tokens: { kind: 'measured', value: 4_800_000 }, cost: { kind: 'measured', value: usd(17.2) } },
              { id: 'evals', title: 'Evaluations', agent: 'Eval service', model: 'Mixed', cost: { kind: 'estimated', value: usd(28.9), basis: 'token price list' } },
            ]}
            total={{ kind: 'measured', value: usd(318.4) }}
            onOpen={(row) => setNotice(`Open the ${row.title} runs.`)}
          />
        </section>
      </div>
      <p className={s.status} role="status">
        {notice}
      </p>
    </div>
  );
}
