import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Run } from '@stackunseen/ui-core';
import { RunCompare } from './run-compare.js';
import { SubagentTree } from './subagent-tree.js';
import type { RunNode } from './subagent-tree.js';
import type { RunSummary } from './run-summary-card.js';

const run = (id: string, lifecycle: Run['lifecycle']): Run => ({
  id,
  attemptId: `${id}-a1`,
  threadId: 't1',
  version: 1,
  lifecycle,
});
const base: RunSummary = {
  run: run('r1', 'succeeded'),
  goal: 'Weekly digest',
  outcome: 'succeeded',
  summary: 'Sent 12.',
  effects: [
    { id: 'e1', kind: 'message', label: '12 emails sent', receiptId: 'cmd-1' },
    { id: 'e2', kind: 'file', label: 'digest.md' },
  ],
  duration: { kind: 'measured', value: 60_000 },
  cost: { kind: 'measured', value: { amount: 1, currency: 'USD' } },
};

describe('RunCompare', () => {
  it('compares fields and effects, marks equal rows, and hides them on request', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RunCompare
        left={{
          label: 'Attempt 1',
          summary: base,
          receipts: [{ commandId: 'cmd-1', status: 'acknowledged' }],
        }}
        right={{
          label: 'Attempt 2',
          summary: {
            ...base,
            run: run('r1b', 'failed'),
            outcome: 'partial',
            effects: [
              { id: 'e1', kind: 'message', label: '12 emails sent', receiptId: 'cmd-1' },
              { id: 'e3', kind: 'record', label: 'Log updated' },
            ],
            notDone: ['One bounce'],
            cost: { kind: 'unknown' },
          },
          receipts: [],
        }}
        onOnlyDifferencesChange={onChange}
      />,
    );
    const table = screen.getByRole('table', { name: 'Attempt 1 compared with Attempt 2' });
    const goal = within(table).getByRole('row', { name: /^Goal/ });
    expect(goal).toHaveAttribute('data-same');
    expect(within(table).getByRole('row', { name: /^Outcome/ })).not.toHaveAttribute('data-same');
    expect(within(table).getByRole('row', { name: /^Cost/ })).toHaveTextContent('Unknown');
    const emails = within(table).getByRole('row', { name: /12 emails sent/ });
    expect(emails).toHaveTextContent('Confirmed');
    expect(emails).toHaveTextContent('Unconfirmed');
    expect(within(table).getByRole('row', { name: /digest\.md/ })).toHaveTextContent(
      'Not produced',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Only differences' }));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(within(table).queryByRole('row', { name: /^Goal/ })).toBeNull();
    expect(within(table).queryByRole('row', { name: /^Duration/ })).toBeNull();
    expect(within(table).getByRole('row', { name: /^Outcome/ })).toBeInTheDocument();
  });

  it('renders both timelines compactly', () => {
    render(
      <RunCompare
        left={{
          label: 'A',
          summary: base,
          timeline: [
            { id: 't1', label: 'Searched', state: 'succeeded', timestamp: '2026-10-16T10:00:00Z' },
          ],
        }}
        right={{ label: 'B', summary: base, timeline: [] }}
        artifacts={<p>artifact diff here</p>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'A timeline' })).toBeInTheDocument();
    expect(screen.getByText('Searched')).toBeInTheDocument();
    expect(screen.getByText('artifact diff here')).toBeInTheDocument();
  });
});

const tree: RunNode = {
  run: run('root', 'running'),
  title: 'Plan the launch',
  agent: { id: 'lead', name: 'Lead agent' },
  heartbeatAt: '2026-10-16T10:09:00Z',
  children: [
    {
      run: run('c1', 'succeeded'),
      title: 'Draft the announcement',
      spawnedBy: { messageId: 'm1', excerpt: 'Write a draft' },
      children: [],
    },
    {
      run: run('c2', 'running'),
      title: 'Book the venue',
      heartbeatAt: '2026-10-16T09:00:00Z',
      children: [{ run: run('c2a', 'queued'), title: 'Compare quotes', children: [] }],
      hasMore: true,
    },
  ],
};

describe('SubagentTree', () => {
  it('exposes a tree with levels, stale children and spawning messages', () => {
    render(<SubagentTree root={tree} now="2026-10-16T10:10:00Z" staleAfterMs={60_000} />);
    const root = screen.getByRole('treeitem', { name: /Plan the launch/ });
    expect(root).toHaveAttribute('aria-level', '1');
    expect(root).toHaveAttribute('aria-expanded', 'true');
    const venue = screen.getByRole('treeitem', { name: /Book the venue/ });
    expect(venue).toHaveAttribute('data-stale');
    expect(venue).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('From: “Write a draft”')).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /Compare quotes/ })).toBeNull();
  });

  it('moves, expands and collapses with the keyboard, selects with Enter and asks the host for more', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onLoadMore = vi.fn();
    render(
      <SubagentTree
        root={tree}
        now="2026-10-16T10:10:00Z"
        onSelect={onSelect}
        onLoadMore={onLoadMore}
      />,
    );
    const root = screen.getByRole('treeitem', { name: /Plan the launch/ });
    root.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('treeitem', { name: /Draft the announcement/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    const venue = screen.getByRole('treeitem', { name: /Book the venue/ });
    expect(venue).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(venue).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('treeitem', { name: /Compare quotes/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(venue).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(venue).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowLeft}');
    expect(root).toHaveFocus();
    await user.keyboard('b');
    expect(venue).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('c2');
    await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Load more runs' }));
    expect(onLoadMore).toHaveBeenCalledWith('c2');
  });

  it('stops at the depth limit and offers the rest through the host', () => {
    const deep: RunNode = {
      run: run('d0', 'running'),
      title: 'Level 0',
      children: [
        {
          run: run('d1', 'running'),
          title: 'Level 1',
          children: [{ run: run('d2', 'queued'), title: 'Level 2', children: [] }],
        },
      ],
    };
    const onLoadMore = vi.fn();
    render(
      <SubagentTree
        root={deep}
        maxDepth={1}
        expandedIds={['d0', 'd1']}
        onLoadMore={onLoadMore}
        now="2026-10-16T10:10:00Z"
      />,
    );
    expect(screen.queryByRole('treeitem', { name: /Level 2/ })).toBeNull();
    expect(screen.getByText(/1 more runs below this level/)).toBeInTheDocument();
    screen.getByRole('button', { name: 'Show them' }).click();
    expect(onLoadMore).toHaveBeenCalledWith('d1');
  });
});
