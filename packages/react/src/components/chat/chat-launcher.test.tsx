import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ChatLauncher } from './chat-launcher.js';

function Demo({ unread = 0 }: { unread?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <ChatLauncher open={open} onOpenChange={setOpen} title="Ask Acme" unread={unread}>
      <p>Earlier reply</p>
      <textarea aria-label="Message" />
    </ChatLauncher>
  );
}

describe('ChatLauncher', () => {
  it('opens a named panel, starts in the composer and returns focus on Escape', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const bubble = screen.getByRole('button', { name: 'Open chat' });
    expect(bubble).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(bubble);
    const panel = screen.getByRole('dialog', { name: 'Ask Acme' });
    expect(panel).toHaveAttribute('aria-modal', 'false');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bubble).toHaveFocus();
  });

  it('keeps the conversation mounted while closed', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Open chat' }));
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'draft');
    await user.click(screen.getByRole('button', { name: 'Close chat' }));
    await user.click(screen.getByRole('button', { name: 'Open chat' }));
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('draft');
  });

  it('announces unread replies on the bubble and caps the badge', () => {
    const { rerender, container } = render(<Demo unread={3} />);
    expect(screen.getByRole('button', { name: 'Open chat, 3 unread' })).toBeInTheDocument();
    rerender(<Demo unread={250} />);
    expect(container.querySelector('[aria-hidden="true"]:not(svg)')).toHaveTextContent('99');
  });
});
