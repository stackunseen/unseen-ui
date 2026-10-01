import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionStatus, componentVariants } from '@ai-interaction/react';

import { connectionInfo } from '../../../../../apps/docs/lib/inspection-fixtures';

describe('capability-aware connection recovery', () => {
  it.each(componentVariants.ConnectionStatus)(
    '%s separates connected transport from stale and unknown snapshot freshness',
    async (variant) => {
      const refresh = vi.fn();
      const resume = vi.fn();
      const value = {
        ...connectionInfo,
        state: 'connected' as const,
        recovery: 'resumed' as const,
        resumedAt: '2026-09-30T08:00:00Z',
        freshness: 'stale' as const,
      };
      const { rerender } = render(
        <ConnectionStatus variant={variant} value={value} onRefresh={refresh} onResume={resume} />,
      );
      expect(screen.getByText('Transport connected')).toBeVisible();
      expect(screen.getByText(/Snapshot stale\./)).toBeVisible();
      expect(screen.queryByText('Connection incompatible')).not.toBeInTheDocument();
      expect(screen.queryByText('Connection restored')).not.toBeInTheDocument();
      expect(screen.getByText(/Transport resumed/)).toBeVisible();
      const footer = screen.getByRole('group', { name: 'Connection recovery' });
      expect(
        within(footer)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(['Refresh snapshot', 'Resume connection']);
      expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Refresh snapshot' }));
      expect(refresh).toHaveBeenCalledOnce();
      expect(resume).not.toHaveBeenCalled();
      // A callback does not establish snapshot freshness.
      expect(screen.getByText(/Snapshot stale\./)).toBeVisible();
      rerender(
        <ConnectionStatus
          variant={variant}
          value={{ ...value, freshness: 'unknown' }}
          onRefresh={refresh}
          onResume={resume}
        />,
      );
      expect(screen.getByText(/Snapshot freshness unknown\./)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Refresh snapshot' })).toBeEnabled();
      rerender(
        <ConnectionStatus
          variant={variant}
          value={{ ...value, freshness: 'current' }}
          onRefresh={refresh}
          onResume={resume}
        />,
      );
      expect(screen.getByText('Connection restored')).toBeVisible();
      expect(screen.queryByRole('group', { name: 'Connection recovery' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Connection details' }));
      expect(screen.getByText('Snapshot freshness')).toBeVisible();
      expect(screen.getByText('Current')).toBeVisible();
    },
  );
  it.each(componentVariants.ConnectionStatus)(
    '%s retains unknown recovery after transport resumes and a snapshot is requested',
    async (variant) => {
      const user = userEvent.setup();
      const refresh = vi.fn();
      const resume = vi.fn();
      render(
        <ConnectionStatus
          variant={variant}
          value={{
            ...connectionInfo,
            state: 'connected',
            recovery: 'resumed',
            freshness: 'current',
            resumedAt: '2026-09-30T08:00:00Z',
          }}
          submission="outcome-unknown"
          onRefresh={refresh}
          onResume={resume}
        />,
      );
      const refreshButton = screen.getByRole('button', { name: 'Refresh snapshot' });
      refreshButton.focus();
      await user.keyboard('{Enter}');
      expect(refresh).toHaveBeenCalledOnce();
      expect(refreshButton).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
      expect(resume).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent('Recovery outcome unknown');
      expect(screen.getByRole('status')).toHaveTextContent('reconcile the original request');
    },
  );
  it.each(componentVariants.ConnectionStatus)(
    '%s does not equate a connected transport and acknowledgement with recovery success',
    (variant) => {
      const value = { ...connectionInfo, state: 'connected' as const };
      const refresh = vi.fn();
      const resume = vi.fn();
      const { rerender } = render(
        <ConnectionStatus
          variant={variant}
          value={value}
          submission="acknowledged"
          onRefresh={refresh}
          onResume={resume}
        />,
      );
      expect(screen.getByText('Transport connected')).toBeVisible();
      expect(screen.queryByText('Connection restored')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Recovery request received. Waiting for host state.',
      );
      expect(screen.getByRole('button', { name: 'Refresh snapshot' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
      rerender(
        <ConnectionStatus
          variant={variant}
          value={value}
          submission="submitting"
          onRefresh={refresh}
          onResume={resume}
        />,
      );
      expect(screen.getByRole('button', { name: 'Refresh snapshot' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
      expect(refresh).not.toHaveBeenCalled();
      expect(resume).not.toHaveBeenCalled();
    },
  );
  it.each(componentVariants.ConnectionStatus)(
    '%s reports unavailable snapshot remedies when the capability or callback is absent',
    (variant) => {
      const value = {
        ...connectionInfo,
        state: 'connected' as const,
        recovery: 'incompatible' as const,
      };
      const refresh = vi.fn();
      const { rerender } = render(
        <ConnectionStatus
          variant={variant}
          value={{ ...value, adapter: { ...value.adapter, snapshot: false } }}
          submission="outcome-unknown"
          onRefresh={refresh}
        />,
      );
      expect(screen.getByText('Connection incompatible')).toBeVisible();
      expect(screen.getByText('Transport connected')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Refresh snapshot' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Snapshot refresh is unavailable here');
      expect(screen.getByText(/An authoritative snapshot is required/)).toBeVisible();
      expect(screen.queryByRole('group', { name: 'Connection recovery' })).not.toBeInTheDocument();
      rerender(<ConnectionStatus variant={variant} value={value} submission="outcome-unknown" />);
      expect(screen.queryByRole('button', { name: 'Refresh snapshot' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Snapshot refresh is unavailable here');
      expect(screen.getByText(/An authoritative snapshot is required/)).toBeVisible();
      rerender(
        <ConnectionStatus
          variant={variant}
          value={{ ...value, recovery: 'none', freshness: 'stale' }}
        />,
      );
      expect(
        screen.getByText(
          'Snapshot refresh is unavailable here. The host must supply current data.',
        ),
      ).toBeVisible();
      expect(refresh).not.toHaveBeenCalled();
    },
  );
  it('preserves the legacy connected view when optional freshness is absent', () => {
    render(
      <ConnectionStatus
        value={{ ...connectionInfo, state: 'connected' }}
        onRefresh={vi.fn()}
        onResume={vi.fn()}
      />,
    );
    expect(screen.getByText('Transport connected')).toBeVisible();
    expect(screen.queryByText(/Snapshot freshness unknown/)).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Connection recovery' })).not.toBeInTheDocument();
  });
  it.each(componentVariants.ConnectionStatus)(
    '%s permits a declared snapshot capability without advertising unsupported replay',
    async (variant) => {
      const refresh = vi.fn();
      const resume = vi.fn();
      render(
        <ConnectionStatus
          variant={variant}
          value={{
            ...connectionInfo,
            freshness: 'stale',
            adapter: { ...connectionInfo.adapter, resume: false, snapshot: true },
          }}
          onRefresh={refresh}
          onResume={resume}
        />,
      );
      expect(screen.getByText('This adapter cannot replay missed updates.')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Resume connection' }));
      expect(resume).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Refresh snapshot' }));
      expect(refresh).toHaveBeenCalledOnce();
      expect(screen.getByText(/Snapshot stale\./)).toBeVisible();
    },
  );
  it.each(componentVariants.ConnectionStatus)(
    '%s resumes only with a supported cursor and leaves status host controlled',
    async (variant) => {
      const resume = vi.fn();
      const refresh = vi.fn();
      const { rerender } = render(
        <ConnectionStatus
          variant={variant}
          value={connectionInfo}
          onResume={resume}
          onRefresh={refresh}
        />,
      );
      expect(resume).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Resume connection' }));
      expect(resume).toHaveBeenCalledExactlyOnceWith(connectionInfo.cursor);
      expect(screen.getByText('Disconnected')).toBeVisible();
      rerender(
        <ConnectionStatus
          variant={variant}
          value={{ ...connectionInfo, recovery: 'incompatible' }}
          onResume={resume}
          onRefresh={refresh}
        />,
      );
      expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Refresh snapshot' }));
      expect(refresh).toHaveBeenCalledOnce();
      rerender(
        <ConnectionStatus
          variant={variant}
          value={{ ...connectionInfo, cursor: { streamId: 's', sequence: NaN } }}
          onResume={resume}
        />,
      );
      expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
    },
  );
  it('blocks resubmission after an unknown recovery outcome but permits snapshot reconciliation', () => {
    render(
      <ConnectionStatus
        value={connectionInfo}
        submission="outcome-unknown"
        onResume={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Resume connection' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh snapshot' })).toBeEnabled();
    expect(within(screen.getByRole('status')).getByText(/Recovery outcome unknown/)).toBeVisible();
  });
});
