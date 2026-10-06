import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MessageQueue } from '@stackunseen/ui';
import { context, item } from '../../../../../tests/fixtures/conversation-navigation.js';

describe('controlled navigation and compact contextual actions', () => {
  it.each(['list', 'cards', 'compact'] as const)(
    '%s retains full queue text and places scoped edits/removals in the item action rail',
    async (variant) => {
      const edit = vi.fn(),
        remove = vi.fn(),
        move = vi.fn();
      render(
        <MessageQueue
          variant={variant}
          context={context}
          items={[{ ...item, text: 'x'.repeat(19999) + '!' }]}
          pagination={{ pageIndex: 1, pageSize: 1, totalItems: 3 }}
          onRequestEdit={edit}
          onRequestCancel={remove}
          onRequestMove={move}
        />,
      );
      expect(screen.getByRole('group', { name: 'Queued message 2 text' }).textContent).toHaveLength(
        20000,
      );
      expect(screen.getByRole('group', { name: 'Queued message 2 text' })).toHaveAttribute(
        'tabindex',
        '0',
      );
      const rail = screen.getByRole('group', { name: 'Actions for message 2' });
      await userEvent.click(within(rail).getByRole('button', { name: 'Move message 2 up' }));
      expect(move).toHaveBeenCalledWith({
        context,
        itemId: 'item',
        itemVersion: '1',
        direction: 'up',
      });
      await userEvent.click(within(rail).getByRole('button', { name: 'Edit message 2' }));
      const field = screen.getByRole('textbox', { name: 'Edit queued draft' });
      fireEvent.change(field, { target: { value: 'Updated' } });
      await userEvent.click(screen.getByRole('button', { name: 'Save queued draft' }));
      expect(edit).toHaveBeenCalledWith({
        context,
        itemId: 'item',
        itemVersion: '1',
        text: 'Updated',
      });
      await userEvent.click(within(rail).getByRole('button', { name: 'Remove message 2' }));
      expect(remove).toHaveBeenCalledWith({ context, itemId: 'item', itemVersion: '1' });
      expect(screen.getByRole('group', { name: 'Queued message 2 text' })).toBeVisible();
    },
  );

  it.each(['list', 'cards', 'compact'] as const)(
    '%s keeps identical drafts distinct without visible ordinal headings',
    async (variant) => {
      const remove = vi.fn();
      render(
        <MessageQueue
          variant={variant}
          context={context}
          items={[item, { ...item, id: 'second', version: '2' }]}
          pagination={{ pageIndex: 1, pageSize: 2, totalItems: 4 }}
          onRequestCancel={remove}
        />,
      );
      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('start', '3');
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getAllByText(item.text)).toHaveLength(2);
      expect(screen.queryByText(/^Message \d+$/)).toBeNull();
      expect(screen.getByRole('group', { name: 'Queued message 3 text' })).toHaveTextContent(
        item.text,
      );
      expect(screen.getByRole('group', { name: 'Queued message 4 text' })).toHaveTextContent(
        item.text,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Remove message 4' }));
      expect(remove).toHaveBeenCalledExactlyOnceWith({
        context,
        itemId: 'second',
        itemVersion: '2',
      });
      expect(screen.getAllByText(item.text)).toHaveLength(2);
    },
  );

  it('locks unknown sends and only offers explicit retry for a failed item', () => {
    const retry = vi.fn();
    const { rerender } = render(
      <MessageQueue
        context={context}
        items={[{ ...item, state: 'outcome-unknown' }]}
        onRequestEdit={() => {}}
        onRequestRetry={retry}
      />,
    );
    expect(screen.getByRole('button', { name: 'Edit message 1' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Retry message 1' })).toBeNull();
    rerender(
      <MessageQueue
        context={context}
        items={[{ ...item, state: 'failed' }]}
        onRequestRetry={retry}
      />,
    );
    expect(screen.getByRole('button', { name: 'Retry message 1' })).toBeEnabled();
    expect(retry).not.toHaveBeenCalled();
  });
});
