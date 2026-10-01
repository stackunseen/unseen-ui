import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SlashCommandMenu } from '@ai-interaction/react';
import { commands } from '../../../../../apps/docs/lib/coding-fixtures';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('searches commands and selects by keyboard without executing a disabled command', async () => {
    const user = userEvent.setup(),
      select = vi.fn();
    const { rerender } = render(
      <SlashCommandMenu items={commands} query="" onQueryChange={() => {}} onSelect={select} />,
    );
    expect(screen.getByRole('option', { name: /deploy/ })).toHaveAttribute('aria-disabled', 'true');
    rerender(
      <SlashCommandMenu
        items={commands}
        query="review"
        onQueryChange={() => {}}
        onSelect={select}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(select).toHaveBeenCalledWith(commands[0]);
  });
});
