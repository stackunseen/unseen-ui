'use client';
import { useState } from 'react';
import { ExecutionTimeline } from '@stackunseen/ui';
import {
  AgentLanes,
  RunBoard,
  SubagentTree,
  emptyRunBoardFilter,
} from '@stackunseen/ui/conversation-flow';
import type {
  AgentLane,
  RunBoardFilter,
  RunCard,
  RunNode,
} from '@stackunseen/ui/conversation-flow';
import '@stackunseen/ui/conversation-flow.css';

// One fixed morning at a demo company, so every view shows the same runs. The host clock is
// fixed too: elapsed times count from it in the browser, nothing else is simulated.
const now = '2026-10-26T09:12:00.000Z';
const runs: RunCard[] = [
  {
    run: { id: 'r1', attemptId: 'a1', threadId: 't1', version: 3, lifecycle: 'waiting-approval' },
    title: 'Migrate users table',
    agent: { id: 'orchestrator', name: 'Orchestrator' },
    owner: { id: 'u1', name: 'Priya' },
    model: 'Opus 5.5',
    startedAt: '2026-10-26T09:05:40.000Z',
    updatedAt: '2026-10-26T09:11:00.000Z',
    summary:
      'Split users into accounts and profiles on Postgres 17. The dry run on staging passed.',
    waitingOn: { kind: 'approval', id: 'ap-1', label: 'Run the migration on production' },
    cost: { kind: 'measured', value: { amount: 0.44, currency: 'USD' } },
    steps: [
      { label: 'Read schema and 14 migrations', at: '2026-10-26T09:06:00.000Z' },
      { label: 'Wrote migration 0042_split_users', at: '2026-10-26T09:08:00.000Z' },
      { label: 'Dry run on staging: no errors', at: '2026-10-26T09:10:00.000Z' },
      { label: 'Wants to run it on production', at: '2026-10-26T09:11:00.000Z' },
    ],
  },
  {
    run: { id: 'r2', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'running' },
    title: 'Review PR #482',
    agent: { id: 'reviewer', name: 'Reviewer' },
    model: 'Sonnet 5.5',
    startedAt: '2026-10-26T09:08:18.000Z',
    heartbeatAt: '2026-10-26T09:11:50.000Z',
    updatedAt: '2026-10-26T09:11:50.000Z',
    summary: 'Billing webhooks: reading the diff and the test run, writing comments.',
    cost: {
      kind: 'estimated',
      value: { amount: 0.12, currency: 'USD' },
      basis: 'token price list',
    },
    steps: [
      { label: 'Read 12 changed files', at: '2026-10-26T09:09:00.000Z' },
      { label: 'Ran the test suite: 214 passed', at: '2026-10-26T09:10:30.000Z' },
      { label: 'Writing review comments', at: '2026-10-26T09:11:50.000Z' },
    ],
  },
  {
    run: { id: 'r3', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'running' },
    title: 'Release notes v2.4',
    agent: { id: 'writer', name: 'Writer' },
    model: 'Sonnet 5.5',
    startedAt: '2026-10-26T09:10:40.000Z',
    heartbeatAt: '2026-10-26T09:11:58.000Z',
    updatedAt: '2026-10-26T09:11:58.000Z',
    summary: 'Grouping 23 merged pull requests into features and fixes.',
    cost: {
      kind: 'estimated',
      value: { amount: 0.03, currency: 'USD' },
      basis: 'token price list',
    },
    steps: [
      { label: 'Collected 23 merged pull requests', at: '2026-10-26T09:11:00.000Z' },
      { label: 'Drafting the highlights', at: '2026-10-26T09:11:58.000Z' },
    ],
  },
  {
    run: { id: 'r4', attemptId: 'a2', threadId: 't4', version: 2, lifecycle: 'failed' },
    title: 'Clean up CRM contacts',
    agent: { id: 'cleaner', name: 'Data cleaner' },
    model: 'Haiku 5.5',
    startedAt: '2026-10-26T08:58:00.000Z',
    updatedAt: '2026-10-26T09:04:00.000Z',
    summary: 'Matched 1,312 likely duplicates, then the merge hit the API rate limit (429).',
    cost: { kind: 'measured', value: { amount: 0.07, currency: 'USD' } },
    steps: [
      { label: 'Loaded 18,240 contacts', at: '2026-10-26T08:59:00.000Z' },
      { label: 'Matched 1,312 likely duplicates', at: '2026-10-26T09:02:00.000Z' },
      { label: 'Merge stopped: API rate limit (429)', at: '2026-10-26T09:04:00.000Z' },
    ],
  },
  {
    run: { id: 'r5', attemptId: 'a1', threadId: 't5', version: 1, lifecycle: 'succeeded' },
    title: 'Weekly metrics digest',
    agent: { id: 'writer', name: 'Writer' },
    model: 'Haiku 5.5',
    startedAt: '2026-10-26T08:45:00.000Z',
    updatedAt: '2026-10-26T08:49:12.000Z',
    summary: 'Pulled numbers from three dashboards and posted the summary to #metrics.',
    cost: { kind: 'measured', value: { amount: 0.02, currency: 'USD' } },
    steps: [
      { label: 'Pulled numbers from 3 dashboards', at: '2026-10-26T08:47:00.000Z' },
      { label: 'Posted to #metrics', at: '2026-10-26T08:49:00.000Z' },
    ],
  },
];
const lanes: AgentLane[] = [
  {
    agent: { id: 'orchestrator', name: 'Orchestrator' },
    tasks: [
      {
        id: 'l1',
        title: 'Plan the pricing page',
        state: 'succeeded',
        startedAt: '2026-10-26T09:00:00.000Z',
        endedAt: '2026-10-26T09:02:30.000Z',
        handoffTo: 'l2',
        cost: '$0.05',
      },
      {
        id: 'l5',
        title: 'Assemble the page',
        state: 'running',
        startedAt: '2026-10-26T09:09:30.000Z',
        cost: '$0.09',
      },
    ],
  },
  {
    agent: { id: 'researcher', name: 'Researcher' },
    tasks: [
      {
        id: 'l2',
        title: 'Compare five competitors',
        state: 'succeeded',
        startedAt: '2026-10-26T09:02:40.000Z',
        endedAt: '2026-10-26T09:06:10.000Z',
        handoffTo: 'l3',
        cost: '$0.09',
      },
    ],
  },
  {
    agent: { id: 'analyst', name: 'Analyst' },
    tasks: [
      {
        id: 'l3',
        title: 'Summarize 120 reviews',
        state: 'succeeded',
        startedAt: '2026-10-26T09:06:20.000Z',
        endedAt: '2026-10-26T09:08:00.000Z',
        handoffTo: 'l4',
        cost: '$0.01',
      },
    ],
  },
  {
    agent: { id: 'writer', name: 'Writer' },
    tasks: [
      {
        id: 'l4',
        title: 'Write the three plans',
        state: 'waiting-approval',
        startedAt: '2026-10-26T09:08:10.000Z',
        cost: '$0.04',
      },
    ],
  },
];
const waterfall = [
  {
    id: 'w1',
    label: 'Plan the migration',
    state: 'succeeded',
    timestamp: '2026-10-26T09:05:40.000Z',
    durationMs: 24_000,
    tokens: '3.1k tokens',
    cost: '$0.06',
  },
  {
    id: 'w1a',
    parentId: 'w1',
    label: 'Read schema',
    state: 'succeeded',
    timestamp: '2026-10-26T09:05:41.000Z',
    durationMs: 6_000,
    tokens: '1.2k tokens',
    cost: '$0.02',
  },
  {
    id: 'w1b',
    parentId: 'w1',
    label: 'Read 14 migrations',
    state: 'succeeded',
    timestamp: '2026-10-26T09:05:48.000Z',
    durationMs: 15_000,
    tokens: '1.9k tokens',
    cost: '$0.04',
  },
  {
    id: 'w2',
    label: 'Write migration 0042_split_users',
    state: 'succeeded',
    timestamp: '2026-10-26T09:06:05.000Z',
    durationMs: 118_000,
    tokens: '9.4k tokens',
    cost: '$0.21',
  },
  {
    id: 'w3',
    label: 'Dry run on staging',
    state: 'succeeded',
    timestamp: '2026-10-26T09:08:04.000Z',
    durationMs: 96_000,
    tokens: '0.8k tokens',
    cost: '$0.02',
  },
  {
    id: 'w3a',
    parentId: 'w3',
    label: 'psql dry run',
    state: 'succeeded',
    timestamp: '2026-10-26T09:08:05.000Z',
    durationMs: 71_000,
    detail: 'Tool call, no model tokens.',
  },
  {
    id: 'w4',
    label: 'Ask to run on production',
    state: 'waiting-approval',
    timestamp: '2026-10-26T09:09:41.000Z',
    tokens: '0.4k tokens',
    cost: '$0.01',
  },
];
const tree: RunNode = {
  run: { id: 'o1', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'running' },
  title: 'Launch the new pricing page by Friday',
  agent: { id: 'orchestrator', name: 'Orchestrator' },
  heartbeatAt: '2026-10-26T09:11:50.000Z',
  cost: { kind: 'measured', value: { amount: 0.14, currency: 'USD' } },
  children: [
    {
      run: { id: 'o2', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'succeeded' },
      title: 'Compare the pricing of five competitors',
      agent: { id: 'researcher', name: 'Researcher' },
      spawnedBy: { messageId: 'm1', excerpt: 'Find out what the five closest competitors charge' },
      cost: { kind: 'measured', value: { amount: 0.09, currency: 'USD' } },
      children: [
        {
          run: { id: 'o3', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'succeeded' },
          title: 'Read the pricing pages of Linear, Notion and three more',
          agent: { id: 'scraper', name: 'Scraper' },
          cost: { kind: 'measured', value: { amount: 0.01, currency: 'USD' } },
          children: [],
        },
      ],
    },
    {
      run: { id: 'o4', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'succeeded' },
      title: 'Summarize 120 reviews that mention price',
      agent: { id: 'analyst', name: 'Analyst' },
      cost: {
        kind: 'estimated',
        value: { amount: 0.01, currency: 'USD' },
        basis: 'token price list',
      },
      children: [],
    },
    {
      run: { id: 'o5', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'waiting-approval' },
      title: 'Write the copy for the three plans',
      agent: { id: 'writer', name: 'Writer' },
      cost: { kind: 'measured', value: { amount: 0.04, currency: 'USD' } },
      children: [],
    },
  ],
};

export function AgentOperations() {
  const [filter, setFilter] = useState<RunBoardFilter>(emptyRunBoardFilter);
  const [selected, setSelected] = useState<string | null>('r1');
  const [lane, setLane] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  return (
    <div className="agent-operations">
      <section className="agent-operations-section" aria-labelledby="ops-inbox">
        <h2 id="ops-inbox">Inbox</h2>
        <p>
          Every background run on one board: what needs you, what is running and what finished. Each
          card shows its newest steps, a live clock and the cost so far.
        </p>
        <RunBoard
          label="Runs"
          hideLabel
          runs={runs}
          now={now}
          filter={filter}
          onFilterChange={setFilter}
          selectedId={selected}
          onSelect={setSelected}
          onAction={(request) =>
            setNotice(
              `${request.action} requested for ${request.runId} (version ${request.version}). The server decides.`,
            )
          }
        />
      </section>
      <section className="agent-operations-section" aria-labelledby="ops-lanes">
        <h2 id="ops-lanes">Lanes</h2>
        <p>
          Where every agent is right now, on one time axis, with the hand-offs drawn between lanes.
          The dashed edge means the task is still running.
        </p>
        <AgentLanes
          label="This morning"
          lanes={lanes}
          now={now}
          selectedId={lane}
          onSelect={(id) => {
            setLane(id);
            setNotice(`Selected task ${id}.`);
          }}
        />
      </section>
      <section className="agent-operations-section" aria-labelledby="ops-waterfall">
        <h2 id="ops-waterfall">Where the time and money went</h2>
        <p>
          One run as a waterfall: a bar per step, children folded under their parent, tokens and
          cost per step and the slowest step marked.
        </p>
        <ExecutionTimeline variant="waterfall" entries={waterfall} />
      </section>
      <section className="agent-operations-section" aria-labelledby="ops-tree">
        <h2 id="ops-tree">Who started whom</h2>
        <p>
          The orchestrator and its sub-agents as a tree. Each run shows its own cost and what the
          whole branch under it cost.
        </p>
        <SubagentTree root={tree} now={now} onSelect={(id) => setNotice(`Open run ${id}.`)} />
      </section>
      <p className="generic-demo-status" role="status">
        {notice}
      </p>
    </div>
  );
}
