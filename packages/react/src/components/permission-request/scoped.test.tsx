import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissionRequest } from '@stackunseen/ui';
import type { PermissionSubmission, PermissionSnapshot } from './permission-model.js';
import {
  permissionFixture,
  permissionCommand,
  permissionReceipt,
} from '../../../../../tests/decision-fixtures.js';

const variants = ['card', 'banner', 'compact'] as const;

afterEach(() => vi.useRealTimers());

describe.each(variants)('%s scoped permission', (variant) => {
  it('emits an exact immutable command and leaves grant status host-owned', async () => {
    const value = permissionFixture(),
      onDecision = vi.fn();
    render(
      <PermissionRequest
        value={value}
        commandId="new-command"
        submission={{ state: 'idle' }}
        onDecision={onDecision}
        variant={variant}
        headingLevel={2}
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Connect to CRM');
    await userEvent.click(screen.getByRole('button', { name: 'Allow access' }));
    const expected = { ...permissionCommand(value), commandId: 'new-command' };
    expect(onDecision).toHaveBeenCalledExactlyOnceWith(expected);
    expect(Object.isFrozen(onDecision.mock.calls[0]![0].target.scopes)).toBe(true);
    expect(Object.isFrozen(value.target)).toBe(false);
    expect(screen.getByText('Permission: requested')).toBeVisible();
    expect(screen.queryByText(/Host-confirmed grant/)).not.toBeInTheDocument();
  });
  it('emits scoped denial independently of allowance', async () => {
    const value = permissionFixture(),
      onDecision = vi.fn();
    render(
      <PermissionRequest
        value={value}
        commandId="deny-original"
        submission={{ state: 'idle' }}
        onDecision={onDecision}
        variant={variant}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Deny access' }));
    expect(onDecision).toHaveBeenCalledExactlyOnceWith({
      commandId: 'deny-original',
      target: value.target,
      decision: 'deny',
    });
  });
  it('looks up the original after request replacement and revocation without replay', async () => {
    const value = permissionFixture(),
      original = permissionCommand(value),
      onDecision = vi.fn(),
      onReconcile = vi.fn();
    const props = {
      commandId: 'next-command',
      submission: { state: 'outcome-unknown', original } as PermissionSubmission,
      onDecision,
      onReconcile,
      variant,
    };
    const { rerender } = render(<PermissionRequest {...props} value={value} />);
    const replacement = permissionFixture();
    replacement.target.version = 'p2';
    replacement.target.scopes = ['accounts:write'];
    replacement.access.state = 'revoked';
    replacement.status = 'revoked';
    rerender(<PermissionRequest {...props} value={replacement} />);
    expect(screen.getByText('Permission: revoked')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deny access' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Check original decision' }));
    expect(onReconcile).toHaveBeenCalledExactlyOnceWith(original);
    expect(onDecision).not.toHaveBeenCalled();
    rerender(
      <PermissionRequest
        {...props}
        value={replacement}
        submission={{ state: 'acknowledged', original, receipt: permissionReceipt(original) }}
      />,
    );
    expect(screen.getByText('Permission: revoked')).toBeVisible();
    expect(screen.queryByText(/Host-confirmed grant/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
  });
  it('rejects mismatched and malformed receipts while preserving lookup', async () => {
    const value = permissionFixture(),
      original = permissionCommand(value),
      onReconcile = vi.fn();
    const props = { value, commandId: 'unused', onDecision: vi.fn(), onReconcile, variant };
    const mismatched = {
      ...permissionReceipt(original),
      command: { ...original, commandId: 'different' },
    };
    const { rerender } = render(
      <PermissionRequest
        {...props}
        submission={{ state: 'acknowledged', original, receipt: mismatched }}
      />,
    );
    expect(screen.getByText(/receipt does not match/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Check original decision' }));
    rerender(
      <PermissionRequest
        {...props}
        submission={
          {
            state: 'outcome-unknown',
            original,
            receipt: { invalid: true },
          } as unknown as PermissionSubmission
        }
      />,
    );
    expect(screen.getByText(/receipt does not match/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Check original decision' }));
    expect(onReconcile).toHaveBeenNthCalledWith(2, original);
  });
  it.each(['accepted', 'unknown', 'not-found'] as const)(
    'keeps %s receipt unresolved without a grant',
    (outcome) => {
      const original = permissionCommand();
      render(
        <PermissionRequest
          value={permissionFixture()}
          commandId="unused"
          submission={{ state: 'acknowledged', original, receipt: { command: original, outcome } }}
          onDecision={vi.fn()}
          onReconcile={vi.fn()}
          variant={variant}
        />,
      );
      expect(screen.getByText('Permission: requested')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Check original decision' })).toBeEnabled();
    },
  );
  it('fails closed for stale, expired, revoked, unknown and invalid snapshots', () => {
    const value = permissionFixture(),
      onDecision = vi.fn();
    const props = {
      commandId: 'decision',
      submission: { state: 'idle' as const },
      onDecision,
      variant,
    };
    const { rerender } = render(<PermissionRequest {...props} value={value} />);
    const blocked: PermissionSnapshot[] = [
      { ...value, freshness: 'stale' },
      { ...value, freshness: 'unknown' },
      { ...value, status: 'unknown' },
      { ...value, status: 'revoked' },
      { ...value, target: { ...value.target, expiresAt: '2000-01-01T00:00:00Z' } },
      { ...value, access: { ...value.access, state: 'unknown' } },
      { ...value, access: { ...value.access, state: 'denied' } },
      { ...value, access: { ...value.access, state: 'revoked' } },
      { ...value, target: { ...value.target, scopes: [] } },
    ];
    for (const next of blocked) {
      rerender(<PermissionRequest {...props} value={next} />);
      expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Deny access' })).toBeDisabled();
    }
    expect(onDecision).not.toHaveBeenCalled();
  });
  it('does not unlock any retained original based on submission alone', () => {
    const value = permissionFixture(),
      original = permissionCommand(value);
    const props = {
      value,
      commandId: 'unused',
      onDecision: vi.fn(),
      onReconcile: vi.fn(),
      variant,
    };
    const { rerender } = render(<PermissionRequest {...props} submission={{ state: 'idle' }} />);
    for (const state of ['submitting', 'acknowledged', 'failed', 'outcome-unknown'] as const) {
      rerender(<PermissionRequest {...props} submission={{ state, original }} />);
      expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
    }
    rerender(
      <PermissionRequest
        {...props}
        submission={{ state: 'outcome-unknown', original }}
        reconciling
      />,
    );
    expect(screen.getByRole('button', { name: 'Checking original decision…' })).toBeDisabled();
  });
});

it('expires an already-rendered decision and rechecks the clock before dispatch', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  const value = permissionFixture(),
    onDecision = vi.fn();
  value.target.expiresAt = '2026-09-30T12:00:01Z';
  render(
    <PermissionRequest
      value={value}
      commandId="expiring"
      submission={{ state: 'idle' }}
      onDecision={onDecision}
    />,
  );
  expect(screen.getByRole('button', { name: 'Allow access' })).toBeEnabled();
  act(() => vi.advanceTimersByTime(1001));
  expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Allow access' }));
  expect(onDecision).not.toHaveBeenCalled();
});

it('hydrates across expiry without a mismatch or dispatch', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
  const value = permissionFixture(),
    onDecision = vi.fn(),
    onRecoverableError = vi.fn();
  value.target.expiresAt = '2026-10-01T00:00:01Z';
  const element = (
    <PermissionRequest
      value={value}
      commandId="hydrate"
      submission={{ state: 'idle' }}
      onDecision={onDecision}
    />
  );
  const container = document.createElement('div');
  container.innerHTML = renderToString(element);
  document.body.appendChild(container);
  vi.setSystemTime(new Date('2026-10-01T00:00:02Z'));
  let root: Root | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(within(container).getByRole('button', { name: 'Allow access' })).toBeDisabled();
    expect(within(container).getByText(/This request has expired/)).toBeVisible();
    fireEvent.click(within(container).getByRole('button', { name: 'Allow access' }));
    expect(onDecision).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});
