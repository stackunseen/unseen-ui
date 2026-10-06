import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BranchSwitcher } from '@stackunseen/ui';

describe('compact contextual actions', () => {
  it.each(['segmented', 'cards', 'select'] as const)(
    '%s branch presentation requests selection without changing host state',
    async (variant) => {
      const select = vi.fn();
      const branches = [
        { id: 'main', label: 'Main', version: '1' },
        { id: 'review', label: 'Review', version: '2' },
      ];
      render(
        <BranchSwitcher
          variant={variant}
          value="main"
          branches={branches}
          onValueChange={select}
        />,
      );
      if (variant === 'select') {
        await userEvent.click(screen.getByRole('combobox', { name: 'Conversation branch' }));
        await userEvent.click(screen.getByRole('option', { name: 'Review' }));
        expect(screen.getByRole('combobox')).toHaveTextContent('Main');
      } else {
        await userEvent.click(screen.getByRole('button', { name: 'Review' }));
        expect(screen.getByRole('button', { name: 'Main' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        expect(screen.getByRole('button', { name: 'Review' })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      }
      expect(select).toHaveBeenCalledWith(branches[1]);
    },
  );
});
