import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Message } from '@stackunseen/ui';
import type { MessageAttachment } from '@stackunseen/ui';
import type { MessageData } from '@stackunseen/ui-core';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const file: MessageAttachment = {
  id: 'file',
  version: '1',
  value: {
    name: 'report.txt',
    state: 'ready',
    preview: { kind: 'text', text: 'Original immutable file content.' },
  },
};

const message: MessageData = {
  id: 'message',
  role: 'assistant',
  state: 'complete',
  revision: 0,
  parts: [{ id: 'part', type: 'attachment', attachmentId: 'file', version: '1' }],
};

describe('attachment reference lifecycle', () => {
  for (const variant of ['plain', 'bubble', 'panel'] as const) {
    it.each(['replaced', 'removed', 'ambiguous'] as const)(
      `${variant} preserves dialog and focus when its file is %s`,
      async (reason) => {
        const user = userEvent.setup(),
          open = vi.fn();
        const original = { ...file, value: { ...file.value, onOpen: open } };
        const { rerender } = render(
          <Message value={message} variant={variant} attachments={[original]} />,
        );
        const trigger = screen.getByRole('button', { name: 'Preview report.txt' });
        await user.click(trigger);
        const dialog = screen.getByRole('dialog');
        within(dialog).getByRole('button', { name: 'Open original' }).focus();
        const resources =
          reason === 'removed'
            ? []
            : reason === 'ambiguous'
              ? [original, original]
              : [
                  {
                    ...original,
                    version: '2',
                    value: {
                      ...original.value,
                      preview: { kind: 'text' as const, text: 'Replacement must not be shown.' },
                    },
                  },
                ];
        rerender(<Message value={message} variant={variant} attachments={resources} />);
        expect(screen.getByRole('dialog')).toBe(dialog);
        expect(within(dialog).getByRole('status')).toHaveTextContent(
          'version of the attachment isn’t available',
        );
        expect(within(dialog).queryByText('Original immutable file content.')).toBeNull();
        expect(within(dialog).queryByText('Replacement must not be shown.')).toBeNull();
        expect(within(dialog).queryByRole('button', { name: 'Open original' })).toBeNull();
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
        rerender(<Message value={message} variant={variant} attachments={[original]} />);
        expect(within(dialog).getByText('Original immutable file content.')).toBeVisible();
        await user.keyboard('{Escape}');
        expect(trigger).toHaveFocus();
        expect(open).not.toHaveBeenCalled();
      },
    );
  }
});
