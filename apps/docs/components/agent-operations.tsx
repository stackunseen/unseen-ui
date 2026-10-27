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

// One Tuesday morning at a small online shop, two days after a payment outage. Every view shows
// the same runs. The host clock is fixed too: elapsed times count from it in the browser, nothing
// else is simulated.
const now = '2026-10-27T08:40:00.000Z';
const runs: RunCard[] = [
  {
    run: { id: 'r1', attemptId: 'a1', threadId: 't1', version: 2, lifecycle: 'waiting-approval' },
    title: 'Refund the double-charged orders',
    agent: { id: 'orders', name: 'Orders agent' },
    owner: { id: 'u1', name: 'Mara' },
    model: 'Opus 5.5',
    startedAt: '2026-10-27T08:21:00.000Z',
    updatedAt: '2026-10-27T08:38:10.000Z',
    summary:
      '38 orders were charged twice during the outage. The refund batch is ready; nothing has gone to the payment provider yet.',
    waitingOn: { kind: 'approval', id: 'ap-1', label: 'Issue 38 refunds (€1,214.60)' },
    cost: { kind: 'measured', value: { amount: 0.31, currency: 'USD' } },
    steps: [
      { label: 'Read the payment log, 2,118 charges', at: '2026-10-27T08:23:00.000Z' },
      { label: 'Matched 38 double charges to their orders', at: '2026-10-27T08:29:00.000Z' },
      { label: 'Drafted a refund batch, €1,214.60', at: '2026-10-27T08:36:00.000Z' },
      { label: 'Wants to issue the refunds', at: '2026-10-27T08:38:10.000Z' },
    ],
  },
  {
    run: { id: 'r2', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'running' },
    title: 'Answer the overnight support tickets',
    agent: { id: 'support', name: 'Support agent' },
    model: 'Sonnet 5.5',
    startedAt: '2026-10-27T08:30:12.000Z',
    heartbeatAt: '2026-10-27T08:39:48.000Z',
    updatedAt: '2026-10-27T08:39:48.000Z',
    summary: '27 tickets came in overnight. Replies are drafted for a person to send, not sent.',
    cost: {
      kind: 'estimated',
      value: { amount: 0.09, currency: 'USD' },
      basis: 'token price list',
    },
    steps: [
      { label: 'Read 27 new tickets', at: '2026-10-27T08:31:00.000Z' },
      { label: 'Drafted 19 replies', at: '2026-10-27T08:38:00.000Z' },
      { label: 'Flagged 3 tickets about refunds for a person', at: '2026-10-27T08:39:48.000Z' },
    ],
  },
  {
    run: { id: 'r3', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'running' },
    title: 'Translate the help centre into German',
    agent: { id: 'translator', name: 'Translator' },
    model: 'Sonnet 5.5',
    startedAt: '2026-10-27T08:12:00.000Z',
    heartbeatAt: '2026-10-27T08:39:55.000Z',
    updatedAt: '2026-10-27T08:39:55.000Z',
    summary: '46 articles. Product names are checked against the glossary before a draft is saved.',
    cost: {
      kind: 'estimated',
      value: { amount: 0.42, currency: 'USD' },
      basis: 'token price list',
    },
    steps: [
      { label: 'Loaded the glossary, 212 terms', at: '2026-10-27T08:12:30.000Z' },
      { label: 'Translated 31 of 46 articles', at: '2026-10-27T08:38:40.000Z' },
      { label: 'Checking “Shipping to the EU” against the glossary', at: '2026-10-27T08:39:55.000Z' },
    ],
  },
  {
    run: { id: 'r4', attemptId: 'a2', threadId: 't4', version: 2, lifecycle: 'failed' },
    title: 'Rebuild the product image cache',
    agent: { id: 'media', name: 'Media agent' },
    model: 'Haiku 5.5',
    startedAt: '2026-10-27T08:02:00.000Z',
    updatedAt: '2026-10-27T08:19:30.000Z',
    summary: 'Resized 2,140 of 3,600 images, then the storage bucket refused writes (403).',
    cost: { kind: 'measured', value: { amount: 0.05, currency: 'USD' } },
    steps: [
      { label: 'Listed 3,600 product images', at: '2026-10-27T08:03:00.000Z' },
      { label: 'Resized 2,140 images to three sizes', at: '2026-10-27T08:18:00.000Z' },
      { label: 'Upload stopped: bucket returned 403', at: '2026-10-27T08:19:30.000Z' },
    ],
  },
  {
    run: { id: 'r5', attemptId: 'a1', threadId: 't5', version: 1, lifecycle: 'succeeded' },
    title: 'Reconcile yesterday’s payouts',
    agent: { id: 'finance', name: 'Finance agent' },
    model: 'Haiku 5.5',
    startedAt: '2026-10-27T07:50:00.000Z',
    updatedAt: '2026-10-27T07:56:40.000Z',
    summary: '212 payouts matched the ledger to the cent. The report is filed under Finance.',
    cost: { kind: 'measured', value: { amount: 0.02, currency: 'USD' } },
    steps: [
      { label: 'Matched 212 payouts against the ledger', at: '2026-10-27T07:55:00.000Z' },
      { label: 'Filed the reconciliation report', at: '2026-10-27T07:56:40.000Z' },
    ],
  },
];
const lanes: AgentLane[] = [
  {
    agent: { id: 'orchestrator', name: 'Orchestrator' },
    tasks: [
      {
        id: 'l1',
        title: 'Plan the winter catalogue',
        state: 'succeeded',
        startedAt: '2026-10-27T08:20:00.000Z',
        endedAt: '2026-10-27T08:22:10.000Z',
        handoffTo: 'l2',
        cost: '$0.04',
      },
      {
        id: 'l5',
        title: 'Assemble the catalogue pages',
        state: 'running',
        startedAt: '2026-10-27T08:36:00.000Z',
        cost: '$0.07',
      },
    ],
  },
  {
    agent: { id: 'analyst', name: 'Analyst' },
    tasks: [
      {
        id: 'l2',
        title: 'Pull last winter’s best sellers',
        state: 'succeeded',
        startedAt: '2026-10-27T08:22:20.000Z',
        endedAt: '2026-10-27T08:26:00.000Z',
        handoffTo: 'l3',
        cost: '$0.03',
      },
      {
        id: 'l3',
        title: 'Price the 64 new products',
        state: 'succeeded',
        startedAt: '2026-10-27T08:26:10.000Z',
        endedAt: '2026-10-27T08:31:30.000Z',
        handoffTo: 'l4',
        cost: '$0.06',
      },
    ],
  },
  {
    agent: { id: 'writer', name: 'Writer' },
    tasks: [
      {
        id: 'l4',
        title: 'Write 64 product descriptions',
        state: 'waiting-approval',
        startedAt: '2026-10-27T08:31:40.000Z',
        cost: '$0.18',
      },
    ],
  },
  {
    agent: { id: 'media', name: 'Media agent' },
    tasks: [
      {
        id: 'l6',
        title: 'Pick a hero image per category',
        state: 'failed',
        startedAt: '2026-10-27T08:24:00.000Z',
        endedAt: '2026-10-27T08:25:20.000Z',
        cost: '$0.01',
      },
    ],
  },
];
const waterfall = [
  {
    id: 'w1',
    label: 'Find the double charges',
    state: 'succeeded',
    timestamp: '2026-10-27T08:21:00.000Z',
    durationMs: 480_000,
    tokens: '6.2k tokens',
    cost: '$0.09',
  },
  {
    id: 'w1a',
    parentId: 'w1',
    label: 'Read the payment log',
    state: 'succeeded',
    timestamp: '2026-10-27T08:21:02.000Z',
    durationMs: 110_000,
    tokens: '2.4k tokens',
    cost: '$0.03',
  },
  {
    id: 'w1b',
    parentId: 'w1',
    label: 'Match charges to orders',
    state: 'succeeded',
    timestamp: '2026-10-27T08:22:55.000Z',
    durationMs: 365_000,
    tokens: '3.8k tokens',
    cost: '$0.06',
  },
  {
    id: 'w2',
    label: 'Check each pair against the order history',
    state: 'succeeded',
    timestamp: '2026-10-27T08:29:05.000Z',
    durationMs: 400_000,
    tokens: '11.3k tokens',
    cost: '$0.17',
  },
  {
    id: 'w3',
    label: 'Draft the refund batch',
    state: 'succeeded',
    timestamp: '2026-10-27T08:35:50.000Z',
    durationMs: 130_000,
    tokens: '1.9k tokens',
    cost: '$0.03',
  },
  {
    id: 'w3a',
    parentId: 'w3',
    label: 'payments.refunds.preview',
    state: 'succeeded',
    timestamp: '2026-10-27T08:36:10.000Z',
    durationMs: 84_000,
    detail: 'Tool call, no model tokens.',
  },
  {
    id: 'w4',
    label: 'Ask to issue the refunds',
    state: 'waiting-approval',
    timestamp: '2026-10-27T08:38:10.000Z',
    tokens: '0.6k tokens',
    cost: '$0.02',
  },
];
const tree: RunNode = {
  run: { id: 'o1', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'running' },
  title: 'Publish the winter catalogue before 1 November',
  agent: { id: 'orchestrator', name: 'Orchestrator' },
  heartbeatAt: '2026-10-27T08:39:50.000Z',
  cost: { kind: 'measured', value: { amount: 0.11, currency: 'USD' } },
  children: [
    {
      run: { id: 'o2', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'succeeded' },
      title: 'Pull last winter’s best sellers',
      agent: { id: 'analyst', name: 'Analyst' },
      spawnedBy: { messageId: 'm1', excerpt: 'Start from what sold best last winter' },
      cost: { kind: 'measured', value: { amount: 0.03, currency: 'USD' } },
      children: [
        {
          run: { id: 'o3', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'succeeded' },
          title: 'Query the orders warehouse for November to February',
          agent: { id: 'query', name: 'Query agent' },
          cost: { kind: 'measured', value: { amount: 0.01, currency: 'USD' } },
          children: [],
        },
      ],
    },
    {
      run: { id: 'o4', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'succeeded' },
      title: 'Price the 64 new products',
      agent: { id: 'analyst', name: 'Analyst' },
      cost: {
        kind: 'estimated',
        value: { amount: 0.06, currency: 'USD' },
        basis: 'token price list',
      },
      children: [],
    },
    {
      run: { id: 'o5', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'waiting-approval' },
      title: 'Write 64 product descriptions',
      agent: { id: 'writer', name: 'Writer' },
      cost: { kind: 'measured', value: { amount: 0.18, currency: 'USD' } },
      children: [],
    },
    {
      run: { id: 'o6', attemptId: 'a1', threadId: 'tt', version: 1, lifecycle: 'failed' },
      title: 'Pick a hero image per category',
      agent: { id: 'media', name: 'Media agent' },
      cost: { kind: 'measured', value: { amount: 0.01, currency: 'USD' } },
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
        <h2 id="ops-inbox">Runs</h2>
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
          The dashed edge means the task is still running; a red edge means it failed.
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
          The refund run as a waterfall: a bar per step, children folded under their parent, tokens
          and cost per step and the slowest step marked.
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
