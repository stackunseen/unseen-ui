import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryPanel } from './memory-panel.js';
import type { MemoryEntry } from './memory-panel.js';

const entries: MemoryEntry[] = [
  {
    id: 'm1',
    text: 'Prefers metric units',
    scope: 'user',
    source: { kind: 'person', label: 'Settings', at: '2026-10-01T09:00:00Z' },
    pinned: true,
    usedInContext: true,
  },
  {
    id: 'm2',
    text: 'The staging database is read-only on Fridays',
    scope: 'project',
    source: { kind: 'conversation', label: 'Deploy thread', at: '2026-10-02T09:00:00Z' },
  },
];
const base = { entries, query: '', onQueryChange: () => {}, onRequest: () => {} };
const second = () => screen.getByRole('group', { name: /staging database/ });

describe('MemoryPanel', () => {
  it('counts what is saved and used, and names each row by its memory rather than its id', () => {
    render(<MemoryPanel {...base} />);
    const panel = screen.getByRole('region', { name: 'Memory' });
    expect(panel).toHaveTextContent('2 saved, 1 used in this request');
    expect(screen.getByRole('list', { name: '2 memories' })).toBeVisible();
    const first = screen.getByRole('group', { name: 'Actions for memory: Prefers metric units' });
    expect(within(first).getByRole('button', { name: 'Unpin' })).toBeVisible();
    expect(screen.queryByRole('group', { name: /m1|m2/ })).toBeNull();
    expect(panel).toHaveTextContent('Everywhere');
    expect(panel).toHaveTextContent('Written by a person: Settings');
  });

  it('shortens a long memory in the group name', () => {
    const long = 'word '.repeat(40).trim();
    render(<MemoryPanel {...base} entries={[{ ...entries[1]!, text: long }]} />);
    const name = screen.getByRole('group').getAttribute('aria-label')!;
    expect(name.endsWith('…')).toBe(true);
    expect(name.length).toBeLessThan(90);
  });

  it('asks the host to pin, unpin or forget and changes nothing itself', async () => {
    const onRequest = vi.fn();
    render(<MemoryPanel {...base} onRequest={onRequest} />);
    await userEvent.click(within(second()).getByRole('button', { name: 'Pin' }));
    await userEvent.click(within(second()).getByRole('button', { name: 'Forget' }));
    await userEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    expect(onRequest.mock.calls.map(([request]) => request)).toEqual([
      { entryId: 'm2', action: 'pin' },
      { entryId: 'm2', action: 'forget' },
      { entryId: 'm1', action: 'unpin' },
    ]);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows a pending, failed or unknown receipt on its row', () => {
    const { rerender } = render(
      <MemoryPanel {...base} receipts={{ m2: { commandId: 'c1', status: 'submitting' } }} />,
    );
    expect(within(second()).getByRole('status')).toHaveTextContent('Waiting for confirmation');
    expect(within(second()).getByRole('button', { name: 'Forget' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Unpin' })).toBeEnabled();
    rerender(
      <MemoryPanel
        {...base}
        receipts={{ m2: { commandId: 'c1', status: 'failed', message: 'No permission' } }}
      />,
    );
    expect(within(second()).getByRole('status')).toHaveTextContent('Not changed: No permission');
    expect(within(second()).getByRole('button', { name: 'Forget' })).toBeEnabled();
    rerender(
      <MemoryPanel {...base} receipts={{ m2: { commandId: 'c1', status: 'outcome-unknown' } }} />,
    );
    expect(within(second()).getByRole('status')).toHaveTextContent('Outcome unknown');
  });

  it('filters by every word and tells an empty filter from an empty memory', async () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <MemoryPanel {...base} query="staging project" onQueryChange={onQueryChange} />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter memories' }), 'x');
    expect(onQueryChange).toHaveBeenCalledWith('staging projectx');
    rerender(<MemoryPanel {...base} query="nothing like this" />);
    expect(screen.getByText('No memories match the filter.')).toBeVisible();
    rerender(<MemoryPanel {...base} entries={[]} />);
    expect(screen.getByText('Nothing is remembered yet.')).toBeVisible();
  });
});
