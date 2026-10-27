'use client';
import { useState } from 'react';
import { Button, Chart, Select, Stat, StatusBadge, TestResults } from '@stackunseen/ui';
import type { TestResult } from '@stackunseen/ui';
import { DataGrid, PageHeader } from '@stackunseen/ui/application';
import type { DataGridColumn, DataGridSort } from '@stackunseen/ui/application';
import { RunCompare } from '@stackunseen/ui/conversation-flow';
import s from './screens.module.css';

interface EvalRun {
  id: string;
  suite: string;
  model: string;
  score: number;
  previous: number;
  cases: number;
  failed: number;
  state: 'succeeded' | 'running' | 'failed';
  at: string;
}
const runs: EvalRun[] = [
  { id: 'e1', suite: 'Support replies', model: 'Opus 5.5', score: 0.93, previous: 0.91, cases: 240, failed: 17, state: 'succeeded', at: '2026-10-27T07:40:00Z' },
  { id: 'e2', suite: 'Support replies', model: 'Sonnet 5.5', score: 0.88, previous: 0.89, cases: 240, failed: 29, state: 'succeeded', at: '2026-10-27T07:38:00Z' },
  { id: 'e3', suite: 'Refund policy', model: 'Opus 5.5', score: 0.97, previous: 0.95, cases: 80, failed: 2, state: 'succeeded', at: '2026-10-27T07:21:00Z' },
  { id: 'e4', suite: 'Refund policy', model: 'Haiku 5.5', score: 0.81, previous: 0.86, cases: 80, failed: 15, state: 'succeeded', at: '2026-10-27T07:19:00Z' },
  { id: 'e5', suite: 'Tool selection', model: 'Opus 5.5', score: 0.9, previous: 0.9, cases: 120, failed: 12, state: 'running', at: '2026-10-27T08:35:00Z' },
  { id: 'e6', suite: 'Tool selection', model: 'Sonnet 5.5', score: 0, previous: 0.84, cases: 120, failed: 0, state: 'failed', at: '2026-10-27T08:30:00Z' },
];
const history = [
  { label: '20 Oct', value: 0.86 },
  { label: '21 Oct', value: 0.87 },
  { label: '22 Oct', value: 0.85 },
  { label: '23 Oct', value: 0.89 },
  { label: '24 Oct', value: 0.9 },
  { label: '25 Oct', value: 0.9 },
  { label: '26 Oct', value: 0.91 },
  { label: '27 Oct', value: 0.93 },
];
const cases: TestResult[] = [
  { id: 'c1', name: 'Refund within 14 days: approves and cites the policy', state: 'passed', durationMs: 1800 },
  { id: 'c2', name: 'Refund after 14 days: declines politely', state: 'passed', durationMs: 1650 },
  { id: 'c3', name: 'Double charge: offers refund, never promises timing', state: 'failed', durationMs: 2100, detail: 'Promised "within 24 hours". Expected: no delivery promise.' },
  { id: 'c4', name: 'Unknown order number: asks for it once', state: 'passed', durationMs: 900 },
  { id: 'c5', name: 'Angry tone: stays calm, no apology loop', state: 'failed', durationMs: 2400, detail: 'Apologised four times. Expected: at most once.' },
  { id: 'c6', name: 'Gift card refund: routes to a person', state: 'passed', durationMs: 1200 },
];
const percent = (value: number) => `${Math.round(value * 100)}%`;
const columns: readonly DataGridColumn<EvalRun>[] = [
  { id: 'suite', header: 'Suite', sortable: true, rowHeader: true, cell: (row) => row.suite },
  { id: 'model', header: 'Model', sortable: true, cell: (row) => row.model },
  {
    id: 'score',
    header: 'Score',
    sortable: true,
    align: 'end',
    cell: (row) => (row.state === 'failed' ? '—' : percent(row.score)),
  },
  {
    id: 'delta',
    header: 'Change',
    align: 'end',
    cell: (row) => {
      if (row.state === 'failed') return '—';
      const delta = Math.round((row.score - row.previous) * 100);
      return delta === 0 ? '±0' : `${delta > 0 ? '+' : ''}${delta} pts`;
    },
  },
  { id: 'cases', header: 'Cases', align: 'end', cell: (row) => `${row.cases - row.failed}/${row.cases}` },
  { id: 'state', header: 'State', cell: (row) => <StatusBadge state={row.state} /> },
];

/**
 * An evaluations screen: scores over time, the latest runs per suite and model, failing cases
 * and a comparison of two runs. Every number is sample data supplied as if by a host; nothing
 * is computed from a model in the page.
 */
export function EvalsScreen() {
  const [suite, setSuite] = useState('all');
  const [sort, setSort] = useState<DataGridSort | null>({ columnId: 'suite', direction: 'asc' });
  const [selected, setSelected] = useState('e1');
  const [notice, setNotice] = useState('');
  const shown = runs
    .filter((run) => suite === 'all' || run.suite === suite)
    .sort((a, b) => {
      if (!sort) return 0;
      const left = a[sort.columnId as keyof EvalRun];
      const right = b[sort.columnId as keyof EvalRun];
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right));
      return sort.direction === 'asc' ? order : -order;
    });
  const current = runs.find((run) => run.id === selected) ?? runs[0]!;
  const regressions = runs.filter((run) => run.state === 'succeeded' && run.score < run.previous);
  return (
    <div className={s.screen} data-template="evals">
      <PageHeader
        title="Evaluations"
        description="Scores per suite and model, from the last run of each. Re-running is a request to the eval service."
        actions={
          <Button size="sm" onClick={() => setNotice('Run requested for all suites; the eval service queues it.')}>
            Run all suites
          </Button>
        }
      />
      <div className={s.stats}>
        <Stat label="Pass rate, all suites" value="91%" delta="+2 pts since 20 Oct" trend="up" note="Measured on 27 Oct" />
        <Stat label="Cases run today" value="880" note="6 runs, 1 still running" />
        <Stat label="Regressions" value={String(regressions.length)} delta={regressions.length ? 'Needs a look' : 'None'} trend={regressions.length ? 'down' : 'neutral'} note="Score below the previous run" />
        <Stat label="Eval cost today" value="$4.12" note="Measured by billing" />
      </div>
      <div className={s.grid}>
        <section className={`${s.panel} ${s.wide}`} aria-labelledby="evals-history">
          <div className={s.panelHead}>
            <h2 id="evals-history">Pass rate over the last eight days</h2>
            <span>All suites, daily</span>
          </div>
          <Chart
            variant="line"
            title="Pass rate"
            points={history}
            unit="ratio"
            source="eval service, nightly"
            asOf="2026-10-27T08:00:00Z"
            formatValue={(value) => percent(value)}
          />
        </section>
        <section className={`${s.panel} ${s.side}`} aria-labelledby="evals-failing">
          <div className={s.panelHead}>
            <h2 id="evals-failing">Failing cases</h2>
            <span>{current.suite}, {current.model}</span>
          </div>
          <TestResults
            variant="compact"
            results={current.state === 'failed' ? [] : cases}
            onOpenFile={(file) => setNotice(`Open ${file}.`)}
          />
        </section>
        <section className={`${s.panel} ${s.full}`} aria-labelledby="evals-runs">
          <div className={s.panelHead}>
            <h2 id="evals-runs">Latest runs</h2>
            <div className={s.toolbar}>
              <label>
                Suite
                <Select
                  value={suite}
                  onValueChange={setSuite}
                  options={[
                    { value: 'all', label: 'All suites' },
                    { value: 'Support replies', label: 'Support replies' },
                    { value: 'Refund policy', label: 'Refund policy' },
                    { value: 'Tool selection', label: 'Tool selection' },
                  ]}
                />
              </label>
            </div>
          </div>
          <DataGrid
            caption="Evaluation runs"
            columns={columns}
            rows={shown}
            getRowId={(row) => row.id}
            sort={sort}
            onSortChange={setSort}
            selectedRowIds={[selected]}
            onSelectionChange={(ids) => {
              const id = ids.find((item) => String(item) !== selected);
              if (id !== undefined) setSelected(String(id));
            }}
          />
        </section>
        <section className={`${s.panel} ${s.full}`} aria-labelledby="evals-compare">
          <div className={s.panelHead}>
            <h2 id="evals-compare">Opus 5.5 against Sonnet 5.5 on Support replies</h2>
            <span>Same 240 cases, same day</span>
          </div>
          <RunCompare
            left={{
              label: 'Opus 5.5',
              summary: {
                run: { id: 'e1', attemptId: 'a1', threadId: 'eval', version: 1, lifecycle: 'succeeded' },
                goal: 'Answer 240 support tickets the way the guide says',
                outcome: 'succeeded',
                summary: '223 of 240 passed. Failures cluster on refund timing promises.',
                effects: [],
                notDone: ['17 cases failed'],
                duration: { kind: 'measured', value: 412_000 },
                cost: { kind: 'measured', value: { amount: 2.31, currency: 'USD' } },
              },
            }}
            right={{
              label: 'Sonnet 5.5',
              summary: {
                run: { id: 'e2', attemptId: 'a1', threadId: 'eval', version: 1, lifecycle: 'succeeded' },
                goal: 'Answer 240 support tickets the way the guide says',
                outcome: 'partial',
                summary: '211 of 240 passed. Failures include tone and timing promises.',
                effects: [],
                notDone: ['29 cases failed'],
                duration: { kind: 'measured', value: 198_000 },
                cost: { kind: 'measured', value: { amount: 0.74, currency: 'USD' } },
              },
            }}
          />
        </section>
      </div>
      <p className={s.status} role="status">
        {notice}
      </p>
    </div>
  );
}
