import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ThreadSummary } from '@stackunseen/ui-core';
import { ThreadList, groupThreadsByDate } from './thread-list.js';
import { Button } from '../button/button.js';

// Local noon, so day boundaries do not depend on the test machine's time zone.
const now = new Date(2026, 9, 21, 12, 0, 0);
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 3600_000).toISOString();

const threads: ThreadSummary[] = [
  { id: 'a', title: 'Launch plan', version: '1', updatedAt: at(0) },
  { id: 'b', title: 'Pinned notes', version: '1', updatedAt: at(40), pinned: true },
  { id: 'c', title: 'Yesterday chat', version: '1', updatedAt: at(1) },
  { id: 'd', title: 'Last week', version: '1', updatedAt: at(5) },
  { id: 'e', title: 'Last month', version: '1', updatedAt: at(20) },
  { id: 'f', title: 'Old thread', version: '1', updatedAt: at(90) },
  { id: 'g', title: 'No date', version: '1' },
];

describe('ThreadList date groups and actions', () => {
  it('groups threads by local day with pinned first', () => {
    expect(
      groupThreadsByDate(threads, now).map(({ group, threads: t }) => [group, t.map((x) => x.id)]),
    ).toEqual([
      ['Pinned', ['b']],
      ['Today', ['a']],
      ['Yesterday', ['c']],
      ['Previous 7 days', ['d']],
      ['Previous 30 days', ['e']],
      ['Earlier', ['f', 'g']],
    ]);
  });

  it('renders named groups and keeps each thread selectable', async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    render(
      <ThreadList
        threads={threads}
        query=""
        onSelect={select}
        groupBy="date"
        now={now.toISOString()}
        actions={<Button size="sm">New chat</Button>}
      />,
    );
    const today = screen.getByRole('group', { name: 'Today' });
    expect(within(today).getByRole('button', { name: /Launch plan/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pinned' })).toHaveTextContent('Pinned notes');
    expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('group', { name: 'Yesterday' })).getByRole('button', {
        name: /Yesterday chat/,
      }),
    );
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });

  it('adds host row actions after the built-in ones', () => {
    render(
      <ThreadList
        threads={threads.slice(0, 1)}
        query=""
        onSelect={() => {}}
        onArchive={() => {}}
        rowActions={(thread) => <Button size="sm">Share {thread.title}</Button>}
      />,
    );
    const group = screen.getByRole('group', { name: 'Actions for Launch plan' });
    const buttons = within(group)
      .getAllByRole('button')
      .map((button) => button.textContent || button.getAttribute('aria-label'));
    expect(buttons).toEqual(['Archive Launch plan', 'Share Launch plan']);
  });

  it('rejects a malformed updatedAt instead of guessing a group', () => {
    render(
      <ThreadList
        threads={[{ id: 'x', title: 'Bad date', version: '1', updatedAt: 'yesterday' }]}
        query=""
        onSelect={() => {}}
        groupBy="date"
      />,
    );
    expect(screen.queryByText('Bad date')).toBeNull();
  });
});
