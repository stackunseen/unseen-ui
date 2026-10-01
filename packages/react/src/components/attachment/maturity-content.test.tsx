import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Attachment } from '@ai-interaction/react';
import type { MessageAttachment } from '@ai-interaction/react';

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

describe('attachment reference lifecycle', () => {
  it.each(['row', 'tile', 'compact'] as const)(
    '%s pins an opened identity and requires deliberate reopening to adopt a new version',
    async (variant) => {
      const user = userEvent.setup();
      const original = { attachmentId: 'file', version: '1' },
        next = { attachmentId: 'file', version: '2' };
      const { rerender } = render(
        <Attachment variant={variant} {...file.value} resource={original} />,
      );
      const trigger = screen.getByRole('button', { name: 'Preview report.txt' });
      await user.click(trigger);
      const dialog = screen.getByRole('dialog');
      rerender(
        <Attachment
          variant={variant}
          {...file.value}
          reference={next}
          resource={next}
          preview={{ kind: 'text', text: 'New version content.' }}
        />,
      );
      expect(screen.getByRole('dialog')).toBe(dialog);
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'Attachment version unavailable',
      );
      expect(within(dialog).queryByText('Original immutable file content.')).toBeNull();
      expect(within(dialog).queryByText('New version content.')).toBeNull();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
      await user.click(trigger);
      expect(within(screen.getByRole('dialog')).getByText('New version content.')).toBeVisible();
    },
  );

  it('keeps a legacy preview inspectable when content is removed and returns focus on close', async () => {
    const { rerender } = render(<Attachment {...file.value} />);
    const trigger = screen.getByRole('button', { name: 'Preview report.txt' });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    rerender(<Attachment name="report.txt" state="ready" />);
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(within(dialog).getByRole('status')).toHaveTextContent('The host did not supply content');
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAccessibleName('Inspect report.txt');
  });
  it('keeps unresolved references inspectable without leaking mismatched metadata or media', async () => {
    const { container } = render(
      <Attachment
        name="Private new name"
        state="ready"
        reference={{ attachmentId: 'file', version: '1' }}
        resource={{ attachmentId: 'file', version: '2' }}
        mediaType="image/png"
        detail="Private metadata"
        preview={{ kind: 'image', src: 'https://example.com/private.png', alt: 'Private image' }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByText('Private new name')).toBeNull();
    expect(screen.queryByText('Private metadata')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open original' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Inspect Attachment unavailable' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('version 1');
    expect(within(screen.getByRole('dialog')).queryByRole('img')).toBeNull();
  });
});
