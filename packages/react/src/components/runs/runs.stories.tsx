import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RunBoard, emptyRunBoardFilter } from './run-board.js';
import type { RunBoardFilter, RunCard } from './run-board.js';
import { AttentionQueue } from './attention-queue.js';
import { RunSummaryCard } from './run-summary-card.js';
import { BackgroundStatus } from './background-status.js';
import { RunCompare } from './run-compare.js';
import { SubagentTree } from './subagent-tree.js';
import { proposal } from '../../../../../apps/docs/lib/fixtures';

const now = '2026-10-15T10:10:00Z';
const runs: RunCard[] = [
  {
    run: { id: 'r1', attemptId: 'a1', threadId: 't1', version: 2, lifecycle: 'running' },
    title: 'Archive inactive accounts',
    agent: { id: 'ops', name: 'Ops agent' },
    heartbeatAt: '2026-10-15T10:09:30Z',
    updatedAt: '2026-10-15T10:09:30Z',
    summary: 'Reviewing 3 accounts.',
    cost: {
      kind: 'estimated',
      value: { amount: 0.42, currency: 'USD' },
      basis: 'token price list',
    },
  },
  {
    run: { id: 'r2', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'running' },
    title: 'Index the handbook',
    agent: { id: 'docs', name: 'Docs agent' },
    heartbeatAt: '2026-10-15T09:50:00Z',
  },
  {
    run: { id: 'r3', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'waiting-approval' },
    title: 'Send renewal reminders',
    agent: { id: 'ops', name: 'Ops agent' },
    waitingOn: { kind: 'approval', id: 'approval-1', label: 'Send 12 emails' },
  },
  {
    run: { id: 'r4', attemptId: 'a1', threadId: 't4', version: 1, lifecycle: 'succeeded' },
    title: 'Weekly digest',
    agent: { id: 'docs', name: 'Docs agent' },
    cost: { kind: 'measured', value: { amount: 1.1, currency: 'USD' } },
  },
];

const meta = {
  title: 'Unseen UI/Runs',
  component: RunBoard,
  args: { runs, now, staleAfterMs: 60_000, onAction: () => {} },
} satisfies Meta<typeof RunBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

function Filtered() {
  const [filter, setFilter] = useState<RunBoardFilter>(emptyRunBoardFilter);
  return (
    <RunBoard
      runs={runs}
      now={now}
      filter={filter}
      onFilterChange={setFilter}
      onAction={() => {}}
    />
  );
}
export const Board: Story = { render: () => <Filtered /> };
export const List: Story = { args: { variant: 'list' } };
export const Compact: Story = { args: { variant: 'compact' } };
export const Queue: Story = {
  render: () => (
    <AttentionQueue
      count={{ kind: 'measured', value: 3 }}
      onOpen={() => {}}
      onDismiss={() => {}}
      items={[
        { kind: 'approval', id: 'a1', runId: 'r3', proposal, at: '2026-10-15T10:00:00Z' },
        {
          kind: 'clarification',
          id: 'c1',
          runId: 'r5',
          question: 'Which region?',
          at: '2026-10-15T10:02:00Z',
        },
        {
          kind: 'failure',
          id: 'f1',
          runId: 'r6',
          message: 'Export failed: quota',
          at: '2026-10-15T10:05:00Z',
          retryable: true,
        },
      ]}
    />
  ),
};
export const Summary: Story = {
  render: () => (
    <RunSummaryCard
      summary={{
        run: { id: 'r4', attemptId: 'a1', threadId: 't4', version: 1, lifecycle: 'succeeded' },
        goal: 'Weekly digest',
        outcome: 'partial',
        summary: 'Sent 11 of 12 digests.',
        effects: [
          { id: 'e1', kind: 'message', label: '11 emails sent', receiptId: 'cmd-1' },
          { id: 'e2', kind: 'file', label: 'digest.md', href: '#digest' },
        ],
        notDone: ['One address bounced.'],
        duration: { kind: 'measured', value: 95_000 },
        cost: { kind: 'unknown' },
      }}
      receipts={[{ commandId: 'cmd-1', status: 'acknowledged' }]}
    />
  ),
};
export const Background: Story = {
  render: () => (
    <BackgroundStatus
      running={{ kind: 'measured', value: 2 }}
      waiting={{ kind: 'measured', value: 1 }}
      lastHeartbeatAt="2026-10-15T10:09:00Z"
      now={now}
      onOpen={() => {}}
    />
  ),
};
export const Compare: Story = {
  render: () => (
    <RunCompare
      left={{
        label: 'Attempt 1',
        summary: {
          run: { id: 'r4', attemptId: 'a1', threadId: 't4', version: 1, lifecycle: 'failed' },
          goal: 'Weekly digest',
          outcome: 'partial',
          summary: 'Sent 11 of 12.',
          effects: [{ id: 'e1', kind: 'message', label: '11 emails sent', receiptId: 'cmd-1' }],
          duration: { kind: 'measured', value: 95_000 },
        },
        receipts: [{ commandId: 'cmd-1', status: 'acknowledged' }],
      }}
      right={{
        label: 'Attempt 2',
        summary: {
          run: { id: 'r4', attemptId: 'a2', threadId: 't4', version: 1, lifecycle: 'succeeded' },
          goal: 'Weekly digest',
          outcome: 'succeeded',
          summary: 'Sent 12.',
          effects: [{ id: 'e1', kind: 'message', label: '12 emails sent', receiptId: 'cmd-2' }],
          duration: { kind: 'measured', value: 140_000 },
        },
        receipts: [{ commandId: 'cmd-2', status: 'acknowledged' }],
      }}
    />
  ),
};
export const Tree: Story = {
  render: () => (
    <SubagentTree
      now={now}
      root={{
        run: { id: 'root', attemptId: 'a1', threadId: 't1', version: 2, lifecycle: 'running' },
        title: 'Plan the launch event',
        heartbeatAt: '2026-10-15T10:09:30Z',
        children: [
          {
            run: { id: 'c1', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'succeeded' },
            title: 'Draft the announcement',
            spawnedBy: { messageId: 'm1', excerpt: 'Write a short announcement' },
            children: [],
          },
          {
            run: { id: 'c2', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'running' },
            title: 'Book the venue',
            heartbeatAt: '2026-10-15T09:30:00Z',
            children: [],
            hasMore: true,
          },
        ],
      }}
      onLoadMore={() => {}}
    />
  ),
};
