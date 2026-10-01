import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme, Button, IconButton, IconsProvider, Modal } from '@ai-interaction/react';

const hint = () => document.querySelector('[data-part="icon-hint"]');

describe('IconButton contextual hints', () => {
  it('shows a visual keyboard hint without duplicating its accessible name, then dismisses with Escape', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    const buttonRef = createRef<HTMLButtonElement>();
    render(<IconButton ref={buttonRef} label="Copy answer" icon="copy" onClick={action} />);
    const button = screen.getByRole('button', { name: 'Copy answer' });
    expect(buttonRef.current).toBe(button);
    expect(button).not.toHaveAttribute('title');
    await user.tab();
    expect(button).toHaveFocus();
    expect(hint()).toBeVisible();
    expect(hint()).toHaveTextContent('Copy answer');
    expect(hint()).toHaveAttribute('aria-hidden', 'true');
    expect(button).not.toHaveAttribute('aria-describedby');
    await user.keyboard('{Escape}');
    expect(hint()).toBeNull();
    expect(button).toHaveFocus();
    expect(action).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(action).toHaveBeenCalledOnce();
  });

  it('preserves host descriptions and handlers with a distinct, themed title hint', async () => {
    const focus = vi.fn();
    render(
      <AITheme appearance="dark">
        <p id="scope-help">Only the current draft.</p>
        <IconButton
          label="Remove draft"
          title="Remove this draft from the queue"
          icon="close"
          aria-describedby="scope-help"
          onFocus={focus}
        />
      </AITheme>,
    );
    const button = screen.getByRole('button', { name: 'Remove draft' });
    const theme = button.closest('[data-ai-theme]')?.getAttribute('data-ai-theme');
    expect(button).toHaveAccessibleDescription(
      'Only the current draft. Remove this draft from the queue',
    );
    await userEvent.tab();
    expect(focus).toHaveBeenCalledOnce();
    expect(button).toHaveAccessibleDescription(
      'Only the current draft. Remove this draft from the queue',
    );
    expect(hint()?.closest('[data-ai-theme]')).toHaveAttribute('data-ai-theme', theme);
    await userEvent.keyboard('{Escape}');
    expect(hint()).toBeNull();
    expect(button).toHaveAccessibleDescription(
      'Only the current draft. Remove this draft from the queue',
    );
  });

  it('stays visible while the pointer crosses into the hint and closes after leaving both', async () => {
    vi.useFakeTimers();
    try {
      render(<IconButton label="Inspect source" icon="document" />);
      const button = screen.getByRole('button', { name: 'Inspect source' });
      fireEvent.pointerEnter(button, { pointerType: 'mouse' });
      expect(hint()).toBeVisible();
      const content = hint()!;
      fireEvent.pointerLeave(button, { pointerType: 'mouse', relatedTarget: content });
      fireEvent.pointerEnter(content, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(500));
      expect(hint()).toBe(content);
      fireEvent.pointerLeave(content, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(200));
      expect(hint()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes a hint on disabled/hidden/unmount transitions and keeps no-icon fallback text', async () => {
    const props = { label: 'Retry upload', icon: 'retry' as const };
    const { rerender, unmount } = render(<IconButton {...props} />);
    await userEvent.tab();
    expect(hint()).toBeVisible();
    rerender(<IconButton {...props} disabled />);
    expect(hint()).toBeNull();
    rerender(<IconButton {...props} />);
    expect(hint()).toBeNull();
    fireEvent.pointerEnter(screen.getByRole('button'), { pointerType: 'mouse' });
    expect(hint()).toBeVisible();
    rerender(<IconButton {...props} hidden />);
    expect(hint()).toBeNull();
    rerender(<IconButton {...props} />);
    expect(hint()).toBeNull();
    fireEvent.pointerEnter(screen.getByRole('button'), { pointerType: 'mouse' });
    unmount();
    expect(hint()).toBeNull();
    render(
      <IconsProvider icons={{ retry: null }}>
        <IconButton {...props} />
      </IconsProvider>,
    );
    expect(screen.getByRole('button', { name: 'Retry upload' })).toHaveTextContent('Retry upload');
  });

  it('preserves modal trigger/close refs and a single Escape still dismisses the host dialog', async () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Inspect file"
          description="File details"
          trigger={<IconButton label="Inspect file" icon="document" />}
        >
          <Button>Open original</Button>
        </Modal>
      );
    }
    render(<Demo />);
    const trigger = screen.getByRole('button', { name: 'Inspect file' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('respects an empty title opt-out and preserves a focused hint through focus-induced scroll', async () => {
    const { rerender } = render(<IconButton label="Copy" title="" icon="copy" />);
    await userEvent.tab();
    expect(hint()).toBeNull();
    rerender(<IconButton label="Copy" icon="copy" />);
    fireEvent.pointerEnter(screen.getByRole('button'), { pointerType: 'mouse' });
    expect(hint()).toBeVisible();
    fireEvent.scroll(document);
    expect(hint()).toBeVisible();
  });
});
