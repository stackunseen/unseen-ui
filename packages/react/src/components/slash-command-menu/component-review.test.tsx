import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SlashCommandMenu } from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it('skips disabled commands during keyboard selection', async () => {
    const select = vi.fn();
    render(
      <SlashCommandMenu
        items={[
          { id: 'first', label: 'First', description: 'Available' },
          {
            id: 'blocked',
            label: 'Blocked',
            description: 'Unavailable',
            disabledReason: 'No access',
          },
          { id: 'last', label: 'Last', description: 'Available' },
        ]}
        query=""
        onQueryChange={() => {}}
        onSelect={select}
      />,
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.keyboard('{Home}{ArrowDown}{Enter}');
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'last' }));
  });
});
