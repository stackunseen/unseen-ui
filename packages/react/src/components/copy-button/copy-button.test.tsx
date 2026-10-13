import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './copy-button.js';
import { Snippet } from '../snippet/snippet.js';

afterEach(() => {
  cleanup();
  delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('CopyButton', () => {
  it('copies, announces the real outcome without renaming the button, and resets', async () => {
    const onCopy = vi.fn();
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <CopyButton
        value="https://example.test/page"
        label="Copy link"
        onCopy={onCopy}
        resetMs={40}
      />,
    );
    const button = screen.getByRole('button', { name: 'Copy link' });
    expect(screen.getByRole('status')).toHaveTextContent('');
    await user.click(button);
    expect(writeText).toHaveBeenCalledWith('https://example.test/page');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
    expect(button).toHaveAccessibleName('Copy link');
    expect(button).toHaveAttribute('data-state', 'copied');
    expect(onCopy).toHaveBeenCalledWith(true);
    await waitFor(() => expect(button).toHaveAttribute('data-state', 'idle'));
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('says the copy failed and what to do instead', async () => {
    const onCopy = vi.fn();
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
      configurable: true,
    });
    render(<CopyButton value="x" onCopy={onCopy} />);
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Copy unavailable. Select the text'),
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'failed');
    expect(onCopy).toHaveBeenCalledWith(false);
  });

  it('keeps an accessible name and tooltip when icon only, and renders on the server', async () => {
    render(<CopyButton value="x" label="Copy command" iconOnly />);
    const button = screen.getByRole('button', { name: 'Copy command' });
    expect(button).not.toHaveTextContent('Copy command');
    const user = userEvent.setup();
    await user.hover(button);
    await waitFor(() => expect(screen.getAllByText('Copy command').length).toBeGreaterThan(0));
    const html = renderToString(<CopyButton value="x" label="Copy value" />);
    expect(html).toContain('Copy value');
    expect(html).toContain('role="status"');
  });

  it('is the copy control inside Snippet', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<Snippet prefix="$" code="pnpm add @stackunseen/ui" label="Install command" />);
    await user.click(screen.getByRole('button', { name: 'Copy install command' }));
    expect(writeText).toHaveBeenCalledWith('pnpm add @stackunseen/ui');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
  });
});
