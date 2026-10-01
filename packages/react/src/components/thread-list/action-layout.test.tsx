import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ThreadList } from '@ai-interaction/react';

const thread = {
  id: 'thread',
  title: 'Review the search change',
  detail: 'Updated just now',
  version: '1',
};

describe('compact contextual actions', () => {
  it.each(['list', 'cards', 'compact'] as const)(
    '%s thread rows retain controlled selection and inline rename focus',
    async (variant) => {
      const user = userEvent.setup(),
        select = vi.fn(),
        rename = vi.fn();
      render(
        <ThreadList
          variant={variant}
          threads={[thread]}
          selectedId={thread.id}
          query=""
          onQueryChange={() => {}}
          onSelect={select}
          onRename={rename}
          onArchive={() => {}}
        />,
      );
      const row = screen.getByRole('listitem');
      const action = within(row).getByRole('button', { name: `Rename ${thread.title}` });
      await user.click(
        within(row).getByRole('button', { name: /Review the search change Updated just now/ }),
      );
      expect(select).toHaveBeenCalledWith(thread);
      await user.click(action);
      const input = within(row).getByRole('textbox', { name: 'Conversation title' });
      expect(input).toHaveFocus();
      await user.clear(input);
      await user.type(input, 'Reviewed change');
      await user.click(within(row).getByRole('button', { name: 'Save title' }));
      expect(rename).toHaveBeenCalledWith(thread, 'Reviewed change');
      expect(action).toHaveFocus();
      expect(screen.queryByRole('textbox', { name: 'Conversation title' })).toBeNull();
      expect(screen.getByText(thread.title)).toBeVisible();
    },
  );

  it('keeps read-only thread rows selectable without placeholder actions', async () => {
    const select = vi.fn();
    render(<ThreadList threads={[thread]} query="" onQueryChange={() => {}} onSelect={select} />);
    expect(screen.queryByRole('group', { name: `Actions for ${thread.title}` })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Review the search change/ }));
    expect(select).toHaveBeenCalledWith(thread);
  });
});
