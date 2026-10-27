import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextWindowMeter } from './context-window-meter.js';
import { MemoryPanel } from '../memory-panel/memory-panel.js';

const segments = [
  { id: 'system', label: 'System prompt', tokens: 2000 },
  { id: 'tools', label: 'Tool results', tokens: 18000 },
  { id: 'messages', label: 'Messages', tokens: 7000 },
];

describe('ContextWindowMeter', () => {
  it('draws segments to scale and reads the percentage only with a limit', () => {
    const { rerender } = render(
      <ContextWindowMeter
        variant="detail"
        value={{ kind: 'measured', value: { segments, limit: 32000 }, at: '2026-10-27T08:00:00Z' }}
      />,
    );
    const group = screen.getByRole('group', { name: 'Context window' });
    expect(group).toHaveTextContent('27,000 of 32,000 tokens (84%)');
    expect(group).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByRole('img')).toHaveAccessibleName(/Tool results 18,000 tokens/);
    expect(group).toHaveTextContent('Tool results18,000 (56%)');
    rerender(
      <ContextWindowMeter
        value={{ kind: 'estimated', value: { segments }, basis: 'tokenizer estimate' }}
      />,
    );
    expect(screen.getByRole('group')).toHaveTextContent('27,000 tokens, limit not reported');
    expect(screen.getByRole('group')).toHaveTextContent('Estimated from tokenizer estimate');
    expect(screen.getByRole('group')).toHaveAttribute('data-tone', 'neutral');
  });
  it('shows the reason when nothing was measured', () => {
    render(<ContextWindowMeter variant="inline" value={{ kind: 'unknown', reason: 'the provider reports no usage' }} />);
    expect(screen.getByText(/Not measured: the provider reports no usage/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('MemoryPanel', () => {
  const entries = [
    {
      id: 'm1',
      text: 'Prefers replies in British English.',
      scope: 'user' as const,
      source: { kind: 'conversation' as const, label: 'Chat on 12 October', at: '2026-10-12T09:00:00Z' },
      pinned: true,
      usedInContext: true,
    },
    {
      id: 'm2',
      text: 'The staging database resets every night.',
      scope: 'project' as const,
      source: { kind: 'host' as const, label: 'Workspace settings', at: '2026-10-20T09:00:00Z' },
    },
  ];
  it('filters, shows provenance and treats pin and forget as requests', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <MemoryPanel entries={entries} query="" onQueryChange={onQueryChange} onRequest={onRequest} />,
    );
    expect(screen.getByText('2 saved, 1 used in this request')).toBeInTheDocument();
    expect(screen.getByText('Used just now')).toBeInTheDocument();
    expect(screen.getByText(/Added by your app: Workspace settings/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unpin' }));
    expect(onRequest).toHaveBeenCalledWith({ entryId: 'm1', action: 'unpin' });
    await user.type(screen.getByLabelText('Filter memories'), 's');
    expect(onQueryChange).toHaveBeenCalledWith('s');
    rerender(
      <MemoryPanel
        entries={entries}
        query="staging"
        onQueryChange={onQueryChange}
        onRequest={onRequest}
        receipts={{ m2: { commandId: 'c1', status: 'submitting' } }}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Forget' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for confirmation');
    rerender(
      <MemoryPanel
        entries={entries}
        query="staging"
        onQueryChange={onQueryChange}
        onRequest={onRequest}
        receipts={{ m2: { commandId: 'c1', status: 'failed', message: 'policy holds it' } }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Not changed: policy holds it');
  });
});
