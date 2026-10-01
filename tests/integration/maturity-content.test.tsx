import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MentionPicker, SlashCommandMenu } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('unavailable command results', () => {
  it.each(['list', 'cards', 'compact'] as const)(
    '%s closes the listbox during loading/error/unavailability and restores selection',
    async (variant) => {
      const selected = vi.fn();
      const props = {
        variant,
        items: [{ id: 'review', label: 'Review', description: 'Review changes' }],
        query: '',
        onQueryChange: vi.fn(),
        onSelect: selected,
      };
      const { rerender } = render(<SlashCommandMenu {...props} status="loading" />);
      for (const status of ['loading', 'error'] as const) {
        rerender(<SlashCommandMenu {...props} status={status} />);
        expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('listbox')).toBeNull();
      }
      rerender(
        <MentionPicker
          {...props}
          items={[{ ...props.items[0]!, kind: 'file', version: '1' }]}
          disabled
        />,
      );
      expect(screen.queryByRole('listbox')).toBeNull();
      rerender(<SlashCommandMenu {...props} />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(screen.getByRole('option', { name: /Review/ }));
      expect(selected).toHaveBeenCalledOnce();
    },
  );
});
