import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionStatus } from '@ai-interaction/react';
import { connectionInfo } from '../../../../../apps/docs/lib/inspection-fixtures';

describe('conversation design refinements', () => {
  it.each(['banner', 'card', 'compact'] as const)(
    '%s connection recovery presents secondary before primary and retains exact request semantics',
    async (variant) => {
      const resume = vi.fn(),
        refresh = vi.fn();
      render(
        <ConnectionStatus
          variant={variant}
          value={connectionInfo}
          onRefresh={refresh}
          onResume={resume}
        />,
      );
      const actions = within(
        screen.getByRole('group', { name: 'Connection recovery' }),
      ).getAllByRole('button');
      expect(actions.map((button) => button.textContent)).toEqual([
        'Refresh snapshot',
        'Resume connection',
      ]);
      actions[0]!.focus();
      await userEvent.keyboard('{Enter}');
      await userEvent.tab();
      expect(actions[1]).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(refresh).toHaveBeenCalledOnce();
      expect(resume).toHaveBeenCalledExactlyOnceWith(connectionInfo.cursor);
    },
  );

  it('keeps unknown recovery reconciliation available while primary repetition is disabled', () => {
    render(
      <ConnectionStatus
        value={connectionInfo}
        submission="outcome-unknown"
        onRefresh={() => {}}
        onResume={() => {}}
      />,
    );
    const group = screen.getByRole('group', { name: 'Connection recovery' });
    expect(within(group).getByRole('button', { name: 'Refresh snapshot' })).toBeEnabled();
    expect(within(group).getByRole('button', { name: 'Resume connection' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Recovery outcome unknown');
  });
});
