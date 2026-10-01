import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  MessageQueue,
  MemoryControls,
  MentionPicker,
  SlashCommandMenu,
} from '@ai-interaction/react';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it.each(
    (['list', 'cards', 'compact'] as const).flatMap((variant) =>
      (['command', 'reference'] as const).map((kind) => ({ variant, kind })),
    ),
  )(
    '$variant $kind empty results retain disabled listbox option semantics',
    async ({ variant, kind }) => {
      const select = vi.fn();
      const Picker = kind === 'command' ? SlashCommandMenu : MentionPicker;
      const props = { variant, query: '', onQueryChange: () => {}, onSelect: select };
      const item = {
        id: 'review',
        label: 'Review',
        description: 'Review this file',
        kind: 'file' as const,
        version: '1',
      };
      const { rerender } = render(<Picker {...props} items={[]} />);
      async function expectEmpty() {
        const empty = await screen.findByRole('option', { name: /No matching/ });
        expect(empty).toHaveAttribute('aria-disabled', 'true');
        expect(empty).toHaveAttribute('aria-selected', 'false');
        expect(empty).not.toHaveAttribute('tabindex');
        await userEvent.click(empty);
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.keyboard('{ArrowDown}{Enter}');
        expect(select).not.toHaveBeenCalled();
      }
      await expectEmpty();
      rerender(<Picker {...props} items={[item]} query="no-such-result" />);
      await expectEmpty();
      rerender(<Picker {...props} items={[item]} query="review" />);
      expect(screen.queryByRole('option', { name: /No matching/ })).toBeNull();
      await userEvent.click(screen.getByRole('option', { name: /Review/ }));
      expect(select).toHaveBeenCalledExactlyOnceWith(item);
    },
  );

  it('rejects an excessive queue while preserving the existing memory-window disclosure', () => {
    render(
      <>
        <MessageQueue
          items={Array.from({ length: 51 }, (_, index) => ({
            id: `${index}`,
            version: '1',
            text: `Draft ${index}`,
            state: 'queued' as const,
          }))}
          onEdit={() => {}}
          onCancel={() => {}}
          onMove={() => {}}
        />
        <MemoryControls
          items={Array.from({ length: 101 }, (_, index) => ({
            id: `${index}`,
            version: '1',
            label: `Memory ${index}`,
            value: 'Value',
            scope: 'Workspace',
            state: 'available' as const,
          }))}
          onRequest={() => {}}
        />
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid or excessive conversation data');
    expect(screen.getByText(/Showing the first 100 memories/)).toBeVisible();
    expect(screen.queryByText('Draft 50')).toBeNull();
    expect(screen.queryByText('Memory 100')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move message 50 down' })).toBeNull();
  });
});
