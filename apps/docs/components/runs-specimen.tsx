'use client';
import { useState } from 'react';
import { Button, resolveVariant } from '@stackunseen/ui';
import {
  AttentionQueue,
  BackgroundStatus,
  RunBoard,
  RunCompare,
  RunSummaryCard,
  SubagentTree,
  emptyRunBoardFilter,
} from '@stackunseen/ui/conversation-flow';
import type {
  AttentionItem,
  CommandReceipt,
  RunBoardFilter,
  RunCard,
  RunNode,
  RunSummary,
} from '@stackunseen/ui/conversation-flow';
import '@stackunseen/ui/conversation-flow.css';
import { proposal } from '../lib/fixtures';

const now = '2026-10-15T10:10:00.000Z';
const runs: RunCard[] = [
  {
    run: { id: 'r1', attemptId: 'a1', threadId: 't1', version: 2, lifecycle: 'running' },
    title: 'Archive inactive accounts',
    agent: { id: 'ops', name: 'Ops agent' },
    owner: { id: 'u1', name: 'Priya' },
    heartbeatAt: '2026-10-15T10:09:30.000Z',
    updatedAt: '2026-10-15T10:09:30.000Z',
    summary: 'Reviewing 3 accounts that have been inactive for 90 days.',
    cost: {
      kind: 'estimated',
      value: { amount: 0.42, currency: 'USD' },
      basis: 'token price list',
    },
  },
  {
    run: { id: 'r2', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'queued' },
    title: 'Index the handbook',
    agent: { id: 'docs', name: 'Docs agent' },
  },
  {
    run: { id: 'r3', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'waiting-approval' },
    title: 'Send renewal reminders',
    agent: { id: 'ops', name: 'Ops agent' },
    updatedAt: '2026-10-15T10:04:00.000Z',
    waitingOn: { kind: 'approval', id: 'approval-1', label: 'Send 12 emails' },
  },
  {
    run: { id: 'r4', attemptId: 'a1', threadId: 't4', version: 1, lifecycle: 'succeeded' },
    title: 'Weekly digest',
    agent: { id: 'docs', name: 'Docs agent' },
    updatedAt: '2026-10-15T09:30:00.000Z',
    cost: { kind: 'measured', value: { amount: 1.1, currency: 'USD' } },
  },
];
const attention: AttentionItem[] = [
  { kind: 'approval', id: 'a1', runId: 'r3', proposal, at: '2026-10-15T10:04:00.000Z' },
  {
    kind: 'clarification',
    id: 'c1',
    runId: 'r5',
    question: 'Which data region should the export use?',
    at: '2026-10-15T10:02:00.000Z',
  },
  {
    kind: 'handoff',
    id: 'h1',
    runId: 'r6',
    from: 'Research agent',
    at: '2026-10-15T10:01:00.000Z',
  },
  {
    kind: 'failure',
    id: 'f1',
    runId: 'r7',
    message: 'Export failed: storage quota reached',
    at: '2026-10-15T09:58:00.000Z',
    retryable: true,
  },
];

export function RunsSpecimen({
  name,
  state,
  presentation,
  onNotice,
}: {
  name:
    | 'RunBoard'
    | 'AttentionQueue'
    | 'RunSummaryCard'
    | 'BackgroundStatus'
    | 'RunCompare'
    | 'SubagentTree';
  state: string;
  presentation?: string;
  onNotice: (text: string) => void;
}) {
  const [filter, setFilter] = useState<RunBoardFilter>(
    state === 'Filtered' ? { states: ['running'], agentIds: [], query: '' } : emptyRunBoardFilter,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<CommandReceipt[]>([]);
  const [items, setItems] = useState(attention);
  if (name === 'RunBoard') {
    const shown =
      state === 'Empty'
        ? []
        : state === 'Stale heartbeat'
          ? runs.map((card) =>
              card.run.id === 'r1' ? { ...card, heartbeatAt: '2026-10-15T09:40:00.000Z' } : card,
            )
          : state === 'Failed'
            ? runs.map((card) =>
                card.run.id === 'r4'
                  ? {
                      ...card,
                      run: { ...card.run, lifecycle: 'failed' as const },
                      summary: 'Mail provider rejected the batch.',
                    }
                  : card,
              )
            : runs;
    return (
      <RunBoard
        variant={resolveVariant('RunBoard', presentation)}
        runs={shown}
        now={now}
        staleAfterMs={5 * 60_000}
        filter={filter}
        onFilterChange={setFilter}
        selectedId={selected}
        onSelect={setSelected}
        receipts={receipts}
        onAction={(request) => {
          if (request.action === 'open') {
            onNotice(`Open run ${request.runId}. The host decides where it opens.`);
            return;
          }
          const commandId = `${request.runId}:${request.attemptId}`;
          setReceipts([{ commandId, status: 'submitting' }]);
          onNotice(
            `${request.action} requested for ${request.runId} (version ${request.version}). Waiting for the host.`,
          );
          window.setTimeout(
            () =>
              setReceipts([{ commandId, status: 'acknowledged', at: new Date().toISOString() }]),
            900,
          );
        }}
      />
    );
  }
  if (name === 'AttentionQueue')
    return (
      <AttentionQueue
        variant={resolveVariant('AttentionQueue', presentation)}
        items={state === 'Empty' ? [] : items}
        count={
          state === 'Unknown count'
            ? { kind: 'unknown', reason: 'host offline' }
            : { kind: 'measured', value: state === 'Empty' ? 0 : items.length + 8 }
        }
        onOpen={(item) => onNotice(`Open ${item.kind} ${item.id} for run ${item.runId}.`)}
        onDismiss={(item) => {
          setItems((previous) => previous.filter((entry) => entry.id !== item.id));
          onNotice(`Dismissed ${item.id}. The host still owns the underlying request.`);
        }}
      />
    );
  if (name === 'RunSummaryCard') {
    const outcome =
      state === 'Partial'
        ? 'partial'
        : state === 'Failed'
          ? 'failed'
          : state === 'Unknown outcome'
            ? 'unknown'
            : 'succeeded';
    return (
      <RunSummaryCard
        variant={resolveVariant('RunSummaryCard', presentation)}
        summary={{
          run: {
            id: 'r4',
            attemptId: 'a1',
            threadId: 't4',
            version: 1,
            lifecycle: outcome === 'failed' ? 'failed' : 'succeeded',
          },
          goal: 'Send the weekly digest',
          outcome,
          summary:
            outcome === 'succeeded'
              ? 'Sent 12 digests and filed the report.'
              : outcome === 'partial'
                ? 'Sent 11 of 12 digests.'
                : outcome === 'failed'
                  ? 'The mail provider rejected the batch.'
                  : 'Contact with the run was lost after the first batch.',
          effects: [
            {
              id: 'e1',
              kind: 'message',
              label: `${outcome === 'succeeded' ? 12 : 11} emails sent`,
              receiptId: 'cmd-send',
            },
            { id: 'e2', kind: 'file', label: 'digest-2026-10-15.md', href: '#digest' },
            { id: 'e3', kind: 'record', label: 'Digest log updated' },
          ],
          notDone: outcome === 'partial' ? ['One address bounced and was not retried.'] : undefined,
          duration:
            outcome === 'unknown' ? { kind: 'unknown' } : { kind: 'measured', value: 95_000 },
          cost: {
            kind: 'estimated',
            value: { amount: 0.31, currency: 'USD' },
            basis: 'token price list',
          },
        }}
        receipts={outcome === 'unknown' ? [] : [{ commandId: 'cmd-send', status: 'acknowledged' }]}
        onOpenEffect={(effect) => onNotice(`Open ${effect.kind}: ${effect.label}`)}
        actions={
          <Button size="sm" variant="outline" onClick={() => onNotice('Open run requested.')}>
            Open run
          </Button>
        }
      />
    );
  }
  if (name === 'RunCompare') {
    const first: RunSummary = {
      run: { id: 'r4', attemptId: 'a1', threadId: 't4', version: 1, lifecycle: 'failed' },
      goal: 'Send the weekly digest',
      outcome: state === 'Identical' ? 'succeeded' : 'partial',
      summary: 'Sent 11 of 12 digests.',
      effects: [
        { id: 'e1', kind: 'message', label: '11 emails sent', receiptId: 'cmd-send' },
        { id: 'e2', kind: 'file', label: 'digest-2026-10-15.md' },
      ],
      notDone: state === 'Identical' ? undefined : ['One address bounced.'],
      duration: { kind: 'measured', value: 95_000 },
      cost: {
        kind: 'estimated',
        value: { amount: 0.31, currency: 'USD' },
        basis: 'token price list',
      },
    };
    const second: RunSummary =
      state === 'Identical'
        ? { ...first, run: { ...first.run, attemptId: 'a2' } }
        : {
            ...first,
            run: { ...first.run, attemptId: 'a2', lifecycle: 'succeeded' },
            outcome: 'succeeded',
            summary: 'Sent 12 digests after retrying the bounce.',
            effects: [
              { id: 'e1', kind: 'message', label: '12 emails sent', receiptId: 'cmd-send-2' },
              { id: 'e2', kind: 'file', label: 'digest-2026-10-15.md', receiptId: 'cmd-file' },
              { id: 'e3', kind: 'record', label: 'Digest log updated' },
            ],
            notDone: undefined,
            duration: { kind: 'measured', value: 140_000 },
            cost: { kind: 'unknown', reason: 'usage not reported' },
          };
    const timeline = (prefix: string) => [
      {
        id: prefix + '-1',
        label: 'Collected recipients',
        state: 'succeeded',
        timestamp: '2026-10-15T09:28:00.000Z',
        durationMs: 820,
      },
      {
        id: prefix + '-2',
        label: 'Sent batch',
        state: prefix === 'a' ? 'failed' : 'succeeded',
        timestamp: '2026-10-15T09:29:00.000Z',
      },
    ];
    return (
      <RunCompare
        variant={resolveVariant('RunCompare', presentation)}
        left={{
          label: 'Attempt 1',
          summary: first,
          receipts: [{ commandId: 'cmd-send', status: 'acknowledged' }],
          timeline: state === 'With timelines' ? timeline('a') : undefined,
        }}
        right={{
          label: 'Attempt 2',
          summary: second,
          receipts: [
            { commandId: 'cmd-send-2', status: 'acknowledged' },
            { commandId: 'cmd-file', status: 'acknowledged' },
          ],
          timeline: state === 'With timelines' ? timeline('b') : undefined,
        }}
        onlyDifferences={state === 'Only differences' ? true : undefined}
        onOnlyDifferencesChange={(value) =>
          onNotice('Only differences: ' + (value ? 'on' : 'off') + '.')
        }
      />
    );
  }
  if (name === 'SubagentTree') {
    const venue: RunNode = {
      run: { id: 'c2', attemptId: 'a1', threadId: 't2', version: 1, lifecycle: 'running' },
      title: 'Book the venue',
      agent: { id: 'ops', name: 'Ops agent' },
      heartbeatAt:
        state === 'Stale child' ? '2026-10-15T09:30:00.000Z' : '2026-10-15T10:09:00.000Z',
      spawnedBy: { messageId: 'm2', excerpt: 'Find a venue for 80 people in November' },
      children: [
        {
          run: { id: 'c2a', attemptId: 'a1', threadId: 't3', version: 1, lifecycle: 'queued' },
          title: 'Compare quotes',
          agent: { id: 'ops', name: 'Ops agent' },
          spawnedBy: { messageId: 'm3', excerpt: 'Get three quotes' },
          children:
            state === 'Depth limit'
              ? [
                  {
                    run: {
                      id: 'c2a1',
                      attemptId: 'a1',
                      threadId: 't4',
                      version: 1,
                      lifecycle: 'queued',
                    },
                    title: 'Call the first venue',
                    children: [
                      {
                        run: {
                          id: 'c2a1a',
                          attemptId: 'a1',
                          threadId: 't5',
                          version: 1,
                          lifecycle: 'queued',
                        },
                        title: 'Confirm the date',
                        children: [],
                      },
                    ],
                  },
                ]
              : [],
        },
      ],
      hasMore: state === 'More to load',
    };
    const root: RunNode = {
      run: { id: 'root', attemptId: 'a1', threadId: 't1', version: 2, lifecycle: 'running' },
      title: 'Plan the launch event',
      agent: { id: 'lead', name: 'Lead agent' },
      heartbeatAt: '2026-10-15T10:09:30.000Z',
      children: [
        {
          run: { id: 'c1', attemptId: 'a1', threadId: 't6', version: 1, lifecycle: 'succeeded' },
          title: 'Draft the announcement',
          agent: { id: 'docs', name: 'Docs agent' },
          spawnedBy: { messageId: 'm1', excerpt: 'Write a short announcement' },
          children: [],
        },
        venue,
      ],
    };
    return (
      <SubagentTree
        variant={resolveVariant('SubagentTree', presentation)}
        root={root}
        now={now}
        maxDepth={state === 'Depth limit' ? 2 : 6}
        expandedIds={state === 'Depth limit' ? ['root', 'c2', 'c2a'] : undefined}
        selectedId={selected}
        onSelect={(runId) => {
          setSelected(runId);
          onNotice('Open run ' + runId + '.');
        }}
        onLoadMore={(runId) => onNotice('Load more children of ' + runId + ' from the host.')}
      />
    );
  }
  return (
    <BackgroundStatus
      variant={resolveVariant('BackgroundStatus', presentation)}
      running={{ kind: 'measured', value: state === 'Idle' ? 0 : 2 }}
      waiting={{ kind: 'measured', value: state === 'Waiting' ? 1 : 0 }}
      lastHeartbeatAt={state === 'Stale' ? '2026-10-15T09:30:00.000Z' : '2026-10-15T10:09:00.000Z'}
      now={now}
      onOpen={() => onNotice('Open the run board.')}
    />
  );
}
