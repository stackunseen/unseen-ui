import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentHandoff } from '@stackunseen/ui';
import type { HandoffSubmission, HandoffSnapshot, HandoffReceipt } from './handoff-model.js';
import {
  handoffFixture,
  handoffCommand,
  handoffReceipt,
} from '../../../../../tests/decision-fixtures.js';

const variants = ['card', 'banner', 'compact'] as const;

afterEach(() => vi.useRealTimers());

describe.each(variants)('%s scoped handoff', (variant) => {
  it('requests acceptance without optimistically changing the owner', async () => {
    const value = handoffFixture(),
      onDecision = vi.fn();
    render(
      <AgentHandoff
        value={value}
        commandId="new-handoff"
        submission={{ state: 'idle' }}
        onDecision={onDecision}
        variant={variant}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Accept handoff' }));
    expect(onDecision).toHaveBeenCalledExactlyOnceWith({
      ...handoffCommand(value),
      commandId: 'new-handoff',
    });
    expect(screen.getByText('Current owner: agent-a')).toBeVisible();
    expect(screen.getByText('Requested recipient: agent-b')).toBeVisible();
    expect(screen.getByText(/Source source-1 \(source-v1\)/)).toBeVisible();
    expect(Object.isFrozen(onDecision.mock.calls[0]![0].target.context)).toBe(true);
  });
  it('keeps ownership separate from acceptance and an applied historical receipt', () => {
    const value = handoffFixture(),
      original = handoffCommand(value),
      onDecision = vi.fn();
    const { rerender } = render(
      <AgentHandoff
        value={value}
        commandId="unused"
        submission={{
          state: 'acknowledged',
          original,
          receipt: { command: original, outcome: 'accepted' },
        }}
        onDecision={onDecision}
        variant={variant}
      />,
    );
    expect(screen.getByText('Current owner: agent-a')).toBeVisible();
    expect(screen.getByText(/effect is not yet confirmed/)).toBeVisible();
    rerender(
      <AgentHandoff
        value={{ ...value, status: 'accepted' }}
        commandId="unused"
        submission={{ state: 'acknowledged', original, receipt: handoffReceipt(original) }}
        onDecision={onDecision}
        variant={variant}
      />,
    );
    expect(screen.getByText('Current owner: agent-a')).toBeVisible();
    expect(screen.getByText(/Acceptance does not establish current ownership/)).toBeVisible();
    const current: HandoffSnapshot = {
      ...value,
      status: 'accepted',
      ownership: {
        state: 'acknowledged',
        ownerId: 'agent-b',
        version: 'owner-2',
        acknowledged: { by: 'agent-b', at: '2026-09-30T12:00:00Z' },
      },
    };
    rerender(
      <AgentHandoff
        value={current}
        commandId="unused"
        submission={{ state: 'acknowledged', original, receipt: handoffReceipt(original) }}
        onDecision={onDecision}
        variant={variant}
      />,
    );
    expect(screen.getByText('Current owner: agent-b')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept handoff' })).toBeDisabled();
  });
  it.each(['denied', 'revoked', 'unknown'] as const)(
    'hides context for %s access but retains original lookup',
    async (state) => {
      const value = handoffFixture(),
        original = handoffCommand(value),
        onReconcile = vi.fn(),
        onDecision = vi.fn();
      const props = {
        commandId: 'unused',
        submission: { state: 'outcome-unknown', original } as HandoffSubmission,
        onDecision,
        onReconcile,
        variant,
      };
      const { rerender } = render(<AgentHandoff {...props} value={value} />);
      const next: HandoffSnapshot = {
        ...value,
        target: {
          ...value.target,
          version: 'h2',
          context: { ...value.target.context, version: 'c2' },
        },
        access: { ...value.access, state },
      };
      rerender(<AgentHandoff {...props} value={next} />);
      expect(screen.queryByText(value.summary)).not.toBeInTheDocument();
      expect(screen.queryByText(/Source source-1/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Accept handoff' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Check original handoff' }));
      expect(onReconcile).toHaveBeenCalledExactlyOnceWith(original);
      expect(onDecision).not.toHaveBeenCalled();
    },
  );
  it('rejects forged receipt ownership or context and permits lookup only', async () => {
    const value = handoffFixture(),
      original = handoffCommand(value),
      onReconcile = vi.fn();
    render(
      <AgentHandoff
        value={value}
        commandId="unused"
        submission={{
          state: 'acknowledged',
          original,
          receipt: { ...handoffReceipt(original), ownerId: 'someone-else' } as HandoffReceipt,
        }}
        onDecision={vi.fn()}
        onReconcile={onReconcile}
        variant={variant}
      />,
    );
    expect(screen.getByText(/receipt does not match/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Check original handoff' }));
    expect(onReconcile).toHaveBeenCalledExactlyOnceWith(original);
    expect(screen.getByText('Current owner: agent-a')).toBeVisible();
  });
  it('blocks unknown owners, changed ownership, stale and expired requests', () => {
    const value = handoffFixture(),
      onDecision = vi.fn();
    const props = {
      commandId: 'decision',
      submission: { state: 'idle' as const },
      onDecision,
      variant,
    };
    const { rerender } = render(<AgentHandoff {...props} value={value} />);
    const blocked: HandoffSnapshot[] = [
      { ...value, ownership: { state: 'unknown' } },
      {
        ...value,
        ownership: {
          state: 'acknowledged',
          ownerId: 'agent-c',
          version: 'owner-2',
          acknowledged: { by: 'host', at: '2026-09-30T12:00:00Z' },
        },
      },
      { ...value, freshness: 'stale' },
      { ...value, freshness: 'unknown' },
      { ...value, status: 'unknown' },
      { ...value, target: { ...value.target, expiresAt: '2000-01-01T00:00:00Z' } },
    ];
    for (const next of blocked) {
      rerender(<AgentHandoff {...props} value={next} />);
      expect(screen.getByRole('button', { name: 'Accept handoff' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Decline handoff' })).toBeDisabled();
    }
    expect(onDecision).not.toHaveBeenCalled();
  });
});

it('restores context only after current host access changes and retains an unknown original', () => {
  const value = handoffFixture(),
    original = handoffCommand(value),
    onDecision = vi.fn();
  const submission: HandoffSubmission = { state: 'outcome-unknown', original };
  const props = { commandId: 'unused', submission, onDecision, onReconcile: vi.fn() };
  const { rerender } = render(<AgentHandoff {...props} value={value} />);
  rerender(
    <AgentHandoff {...props} value={{ ...value, access: { ...value.access, state: 'revoked' } }} />,
  );
  expect(screen.queryByText(value.summary)).not.toBeInTheDocument();
  const restored: HandoffSnapshot = {
    ...value,
    target: { ...value.target, version: 'h2', accessVersion: 'access-2' },
    access: { ...value.access, version: 'access-2', state: 'available' },
  };
  rerender(<AgentHandoff {...props} value={restored} />);
  expect(screen.getByText(value.summary)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Accept handoff' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Check original handoff' })).toBeEnabled();
  expect(onDecision).not.toHaveBeenCalled();
});
