import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select, componentVariants } from '@stackunseen/ui';

describe('Select option reuse', () => {
  it.each(componentVariants.Select)(
    '%s reflects replacement options while preserving controlled selection and keyboard focus',
    async (variant) => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const original = [
        { value: 'preview', label: 'Preview' },
        { value: 'production', label: 'Production' },
      ];
      const props = { variant, value: 'preview', onValueChange, 'aria-label': 'Environment' };
      const { rerender } = render(<Select {...props} options={original} />);
      const trigger = screen.getByRole('combobox', { name: 'Environment' });
      await user.tab();
      await user.keyboard('{Enter}');
      const listbox = screen.getByRole('listbox');
      const selected = screen.getByRole('option', { name: 'Preview' });
      expect(selected).toHaveFocus();

      rerender(<Select {...props} options={original} data-host-update="1" />);
      expect(screen.getByRole('listbox')).toBe(listbox);
      expect(selected).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();

      rerender(
        <Select
          {...props}
          options={[
            { value: 'preview', label: 'Updated preview' },
            { value: 'production', label: 'Production unavailable', disabled: true },
            { value: 'staging', label: 'Staging' },
          ]}
        />,
      );
      expect(screen.getByRole('option', { name: 'Updated preview' })).toHaveFocus();
      expect(screen.getByRole('option', { name: 'Production unavailable' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Staging' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('staging');
      expect(trigger).toHaveTextContent('Updated preview');
      expect(trigger).toHaveFocus();
    },
  );
});
