import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Run } from '@stackunseen/ui-core';
import { RunBoard, emptyRunBoardFilter } from './run-board.js';
import type { RunCard } from './run-board.js';
import { AttentionQueue } from './attention-queue.js';
import type { AttentionItem } from './attention-queue.js';
import { RunSummaryCard } from './run-summary-card.js';
import { BackgroundStatus } from './background-status.js';
import { proposal } from '../../../../../apps/docs/lib/fixtures';

const now = '2026-10-15T10:10:00Z';
const run = (id: string, lifecycle: Run['lifecycle']): Run => ({
  id,
  attemptId: `${id}-a1`,
  threadId: 'thread-1',
  version: 2,
  lifecycle,
});
const cards: RunCard[] = [
  {
    run: run('r1', 'running'),
    title: 'Archive inactive accounts',
    agent: { id: 'ops', name: 'Ops agent' },
    heartbeatAt: '2026-10-15T10:09:30Z',
    updatedAt: '2026-10-15T10:09:30Z',
    cost: {
      kind: 'estimated',
      value: { amount: 0.42, currency: 'USD' },
      basis: 'token price list',
    },
  },
  {
    run: run('r2', 'running'),
    title: 'Index the handbook',
    agent: { id: 'docs', name: 'Docs agent' },
    heartbeatAt: '2026-10-15T09:50:00Z',
    summary: 'Reading 412 pages.',
  },
  {
    run: run('r3', 'waiting-approval'),
    title: 'Send renewal reminders',
    agent: { id: 'ops', name: 'Ops agent' },
    waitingOn: { kind: 'approval', id: 'approval-1', label: 'Send 12 emails' },
  },
  {
    run: run('r4', 'succeeded'),
    title: 'Weekly digest',
    agent: { id: 'docs', name: 'Docs agent' },
  },
];

describe('RunBoard', () => {
  it('groups runs, marks a silent running run stale from host clocks only, and keeps unknown cost explicit', () => {
    render(<RunBoard runs={cards} now={now} staleAfterMs={60_000} />);
    const board = screen.getByRole('region', { name: 'Runs' });
    const active = within(board).getByRole('list', { name: /^Active/ });
    expect(within(active).getAllByRole('listitem')).toHaveLength(2);
    expect(within(board).getByRole('list', { name: /^Waiting for you/ })).toHaveTextContent(
      'Waiting on approval: Send 12 emails',
    );
    const silent = within(active)
      .getByRole('button', { name: 'Index the handbook' })
      .closest('article')!;
    expect(silent).toHaveAttribute('data-stale');
    expect(silent).toHaveTextContent('No recent update');
    expect(silent).toHaveTextContent('No update since');
    const fresh = within(active)
      .getByRole('button', { name: 'Archive inactive accounts' })
      .closest('article')!;
    expect(fresh).not.toHaveAttribute('data-stale');
    expect(fresh).toHaveTextContent('~$0.42');
    expect(fresh).toHaveTextContent('estimated from token price list');
  });

  it('never guesses stale without a clock or heartbeat', () => {
    render(
      <RunBoard
        runs={[{ ...cards[1]!, heartbeatAt: undefined }]}
        now={now}
        staleAfterMs={60_000}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Index the handbook' }).closest('article'),
    ).not.toHaveAttribute('data-stale');
  });

  it('moves between cards and columns with the keyboard and reports host actions with versions', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onSelect = vi.fn();
    render(
      <RunBoard runs={cards} now={now} onAction={onAction} onSelect={onSelect} selectedId="r3" />,
    );
    const first = screen.getByRole('button', { name: 'Archive inactive accounts' });
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Index the handbook' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Send renewal reminders' })).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Send renewal reminders' }).closest('article'),
    ).toHaveAttribute('aria-current', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(first).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Index the handbook' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Pause Archive inactive accounts' }));
    expect(onAction).toHaveBeenCalledWith({
      runId: 'r1',
      attemptId: 'r1-a1',
      version: 2,
      action: 'pause',
    });
    await user.click(first);
    expect(onSelect).toHaveBeenCalledWith('r1');
    expect(onAction).toHaveBeenLastCalledWith({
      runId: 'r1',
      attemptId: 'r1-a1',
      version: 2,
      action: 'open',
    });
    expect(screen.queryByRole('button', { name: /Pause Weekly digest/ })).toBeNull();
  });

  it('filters through the host and disables actions while a receipt is pending', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const { rerender } = render(
      <RunBoard
        runs={cards}
        now={now}
        filter={emptyRunBoardFilter}
        onFilterChange={onFilterChange}
        onAction={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'running' }));
    expect(onFilterChange).toHaveBeenCalledWith({ states: ['running'], agentIds: [], query: '' });
    await user.click(screen.getByRole('button', { name: 'Docs agent' }));
    expect(onFilterChange).toHaveBeenCalledWith({ states: [], agentIds: ['docs'], query: '' });
    rerender(
      <RunBoard
        runs={cards}
        now={now}
        filter={{ states: ['succeeded'], agentIds: [], query: 'nothing matches' }}
        onFilterChange={onFilterChange}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No runs match the current filters.');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onFilterChange).toHaveBeenLastCalledWith(emptyRunBoardFilter);
    rerender(
      <RunBoard
        runs={cards}
        now={now}
        onAction={vi.fn()}
        receipts={[{ commandId: 'r1:r1-a1', status: 'submitting' }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Pause Archive inactive accounts' })).toBeDisabled();
    expect(screen.getByText('Waiting for the host…')).toBeInTheDocument();
  });

  it('groups facets as State and Agent and counts them behind the Filters popover', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const filter = { states: ['running' as const], agentIds: ['docs'], query: '' };
    render(<RunBoard runs={cards} now={now} filter={filter} onFilterChange={onFilterChange} />);
    expect(screen.getByRole('group', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Agent' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filters, 2 active' }));
    const popover = screen.getByRole('dialog', { name: 'Filters' });
    const states = within(popover).getByRole('group', { name: 'State' });
    expect(within(states).getByRole('button', { name: 'running' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(states).getByRole('button', { name: 'paused' }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ ...filter, states: ['running', 'paused'] });
  });
});

const items: AttentionItem[] = [
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
];

describe('AttentionQueue', () => {
  it('lists what needs a person, keeps the host count honest and opens items', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <AttentionQueue
        items={items}
        count={{ kind: 'measured', value: 12 }}
        onOpen={onOpen}
        onDismiss={onDismiss}
      />,
    );
    const region = screen.getByRole('region', { name: /Needs your attention/ });
    expect(region).toHaveTextContent('12');
    expect(within(region).getAllByRole('listitem')).toHaveLength(3);
    expect(region).toHaveTextContent('Retry available');
    screen.getByRole('button', { name: 'Archive 3 inactive accounts' }).focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Export failed: quota' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(items[2]);
    await user.click(screen.getByRole('button', { name: 'Dismiss: Which region?' }));
    expect(onDismiss).toHaveBeenCalledWith(items[1]);
    rerender(
      <AttentionQueue
        items={[]}
        count={{ kind: 'unknown', reason: 'host offline' }}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByRole('region', { name: /Needs your attention/ })).toHaveTextContent(
      'Count unavailable (host offline)',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Nothing is waiting on you.');
  });
});

describe('RunSummaryCard', () => {
  it('shows effects as confirmed only with an acknowledged receipt and keeps unknown outcomes loud', async () => {
    const user = userEvent.setup();
    const onOpenEffect = vi.fn();
    const { rerender } = render(
      <RunSummaryCard
        summary={{
          run: run('r4', 'succeeded'),
          goal: 'Weekly digest',
          outcome: 'partial',
          summary: 'Sent 11 of 12 digests.',
          effects: [
            { id: 'e1', kind: 'message', label: '11 emails sent', receiptId: 'cmd-1' },
            { id: 'e2', kind: 'file', label: 'digest.md', href: '/files/digest.md' },
            {
              id: 'e3',
              kind: 'external',
              label: 'javascript:alert(1)',
              href: 'javascript:alert(1)',
            },
          ],
          notDone: ['One address bounced.'],
          duration: { kind: 'measured', value: 95_000 },
          cost: { kind: 'unknown' },
        }}
        receipts={[{ commandId: 'cmd-1', status: 'acknowledged' }]}
        onOpenEffect={onOpenEffect}
      />,
    );
    const card = screen.getByRole('article', { name: 'Run summary: Weekly digest' });
    expect(card).toHaveTextContent('Partly done');
    expect(card).toHaveTextContent('Duration: 2 min');
    expect(card).toHaveTextContent('Cost: Unknown');
    const effects = within(card).getByRole('list', { name: 'Effects' });
    const rows = within(effects).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Confirmed');
    expect(rows[1]).toHaveTextContent('Unconfirmed');
    expect(within(rows[1]!).getByRole('link')).toHaveAttribute('href', '/files/digest.md');
    expect(within(rows[2]!).queryByRole('link')).toBeNull();
    await user.click(within(rows[2]!).getByRole('button'));
    expect(onOpenEffect).toHaveBeenCalledWith(expect.objectContaining({ id: 'e3' }));
    expect(card).toHaveTextContent('One address bounced.');
    rerender(
      <RunSummaryCard
        variant="inline"
        summary={{
          run: run('r7', 'failed'),
          goal: 'Reconcile',
          outcome: 'unknown',
          summary: 'Lost contact.',
          effects: [],
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'The host has not confirmed how this run ended.',
    );
  });
});

describe('BackgroundStatus', () => {
  it('announces counts with their meaning and reports a silent host without guessing', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { rerender } = render(
      <BackgroundStatus
        running={{ kind: 'measured', value: 2 }}
        waiting={{ kind: 'measured', value: 1 }}
        lastHeartbeatAt="2026-10-15T10:09:00Z"
        now={now}
        staleAfterMs={60_000}
        onOpen={onOpen}
      />,
    );
    const button = screen.getByRole('button', { name: 'Background runs' });
    expect(button).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByRole('status')).toHaveTextContent('2 running');
    expect(screen.getByRole('status')).toHaveTextContent('1 waiting for you');
    await user.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
    rerender(
      <BackgroundStatus
        running={{ kind: 'measured', value: 1 }}
        waiting={{ kind: 'unknown' }}
        lastHeartbeatAt="2026-10-15T09:00:00Z"
        now={now}
        staleAfterMs={60_000}
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('? waiting for you');
    expect(status).toHaveTextContent('No update since');
    expect(screen.queryByRole('button')).toBeNull();
    rerender(
      <BackgroundStatus
        running={{ kind: 'measured', value: 0 }}
        waiting={{ kind: 'measured', value: 0 }}
        now={now}
      />,
    );
    expect(screen.getByLabelText('Background runs')).toHaveAttribute('data-tone', 'idle');
  });
});

describe('RunBoard trailing content', () => {
  it('renders host content at the end of each card title row', () => {
    render(
      <RunBoard
        variant="list"
        runs={cards}
        now="2026-10-21T10:00:00Z"
        renderCardTrailing={(card) => <span data-testid={`trail-${card.run.id}`}>+3 −1</span>}
      />,
    );
    for (const card of cards)
      expect(screen.getByTestId(`trail-${card.run.id}`)).toHaveTextContent('+3 −1');
  });
});

describe('RunBoard hideLabel', () => {
  it('keeps the name for assistive technology without a visible heading', () => {
    const { container } = render(<RunBoard runs={cards} label="Tasks" hideLabel now="2026-10-21T12:00:00Z" />);
    expect(screen.getByRole('region', { name: 'Tasks' })).toBeTruthy();
    const heading = screen.getByRole('heading', { level: 2, name: 'Tasks' });
    expect(heading.className).toMatch(/hiddenTitle/);
    expect(container.querySelector('[data-part="run-board"]')).toBeTruthy();
  });
});
