import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MessageQueue } from '@ai-interaction/react';

const queued = { id: 'draft', text: 'Add keyboard tests.', version: '1', state: 'queued' as const };

describe('compact contextual actions', () => {
  it('restores focus to the queue group when the host removes a focused action', async () => {
    const props = { onEdit: vi.fn(), onCancel: vi.fn() };
    const { rerender } = render(<MessageQueue items={[queued]} {...props} />);
    screen.getByRole('button', { name: 'Remove message 1' }).focus();
    rerender(<MessageQueue items={[]} {...props} />);
    expect(screen.getByRole('group', { name: 'Queued messages' })).toHaveFocus();
  });

  it.each(['list', 'cards', 'compact'] as const)(
    '%s queue editors stay in their item and cancel restores focus',
    async (variant) => {
      const user = userEvent.setup(),
        edit = vi.fn(),
        cancel = vi.fn();
      render(<MessageQueue variant={variant} items={[queued]} onEdit={edit} onCancel={cancel} />);
      const row = screen.getByRole('listitem'),
        action = screen.getByRole('button', { name: 'Edit message 1' });
      expect(within(row).queryByRole('button', { name: /Move/ })).toBeNull();
      await user.click(action);
      const input = within(row).getByRole('textbox', { name: 'Edit queued draft' });
      expect(input).toHaveFocus();
      await user.type(input, ' More.');
      await user.keyboard('{Escape}');
      expect(edit).not.toHaveBeenCalled();
      expect(action).toHaveFocus();
      await user.click(screen.getByRole('button', { name: 'Remove message 1' }));
      expect(cancel).toHaveBeenCalledWith(queued);
      expect(screen.getByText(queued.text)).toBeVisible();
    },
  );

  it('rejects stale inline queue saves and locks all actions while pending', async () => {
    const edit = vi.fn(),
      props = { onEdit: edit, onCancel: vi.fn(), onMove: vi.fn() };
    const { rerender } = render(<MessageQueue items={[queued]} {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit message 1' }));
    rerender(<MessageQueue items={[{ ...queued, version: '2', pending: true }]} {...props} />);
    expect(screen.getByRole('button', { name: 'Save queued draft' })).toBeDisabled();
    for (const name of [
      'Edit message 1',
      'Remove message 1',
      'Move message 1 up',
      'Move message 1 down',
    ])
      expect(screen.getByRole('button', { name })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Message changed');
    expect(edit).not.toHaveBeenCalled();
  });
});
