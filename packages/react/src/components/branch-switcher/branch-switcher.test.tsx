import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BranchSwitcher } from '@ai-interaction/react';
import { context, branches } from '../../../../../tests/fixtures/conversation-navigation.js';

describe('controlled navigation and compact contextual actions', () => {
  it.each(['segmented', 'cards', 'select'] as const)(
    '%s confirms a host draft guard and returns focus while keeping selection controlled',
    async (variant) => {
      const select = vi.fn();
      render(
        <BranchSwitcher
          variant={variant}
          context={context}
          value="main"
          branches={branches}
          changeGuard={{ version: 'draft-1', message: 'Save this draft before switching.' }}
          onRequestSelect={select}
        />,
      );
      const origin =
        variant === 'select'
          ? screen.getByRole('combobox')
          : screen.getByRole('button', { name: 'Review' });
      await userEvent.click(origin);
      if (variant === 'select')
        await userEvent.click(screen.getByRole('option', { name: 'Review' }));
      expect(select).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Keep current branch' })).toHaveFocus();
      await userEvent.click(screen.getByRole('button', { name: 'Change branch' }));
      expect(select).toHaveBeenCalledWith({ context, branchId: 'review', branchVersion: '2' });
      expect(origin).toHaveFocus();
      if (variant === 'select') expect(origin).toHaveTextContent('Main');
      else
        expect(screen.getByRole('button', { name: 'Main' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
    },
  );

  it('invalidates a pending branch guard when draft version changes', async () => {
    const select = vi.fn();
    const { rerender } = render(
      <BranchSwitcher
        context={context}
        value="main"
        branches={branches}
        changeGuard={{ version: '1', message: 'Save draft one' }}
        onRequestSelect={select}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    rerender(
      <BranchSwitcher
        context={context}
        value="main"
        branches={branches}
        changeGuard={{ version: '2', message: 'Save draft two' }}
        onRequestSelect={select}
      />,
    );
    expect(screen.getByRole('button', { name: 'Change branch' })).toBeDisabled();
    expect(screen.queryByText('Save draft one')).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });
});
