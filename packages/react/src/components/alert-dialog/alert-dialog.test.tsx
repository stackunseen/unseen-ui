import { createRef } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { AlertDialog } from './alert-dialog.js';

describe('website AlertDialog', () => {
  function Contents({ onAction = vi.fn(), error }: { onAction?: () => void; error?: string }) {
    return (
      <AlertDialog.Content error={error}>
        <AlertDialog.Title>Delete saved view?</AlertDialog.Title>
        <AlertDialog.Description>
          This removes the saved layout, not your source data.
        </AlertDialog.Description>
        <AlertDialog.Actions>
          <AlertDialog.Cancel>Keep view</AlertDialog.Cancel>
          <AlertDialog.Action onAction={onAction}>Delete view</AlertDialog.Action>
        </AlertDialog.Actions>
      </AlertDialog.Content>
    );
  }

  it('focuses the safe choice, traps keyboard focus, ignores outside clicks and restores focus on cancel', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Outside</button>
        <AlertDialog>
          <AlertDialog.Trigger>Delete</AlertDialog.Trigger>
          <Contents />
        </AlertDialog>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Delete' });
    await user.click(trigger);
    const dialog = screen.getByRole('alertdialog', { name: 'Delete saved view?' });
    expect(dialog).toHaveAccessibleDescription(
      'This removes the saved layout, not your source data.',
    );
    const cancel = within(dialog).getByRole('button', { name: 'Keep view' });
    await waitFor(() => expect(cancel).toHaveFocus());
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Delete view' })).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    fireEvent.pointerDown(document.body);
    expect(dialog).toBeVisible();
    await user.click(cancel);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('emits action intent without closing, reflects host busy/error and waits for acknowledged closure', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    const onOpenChange = vi.fn();
    const view = (busy = false, error?: string, open = true) => (
      <AITheme appearance="dark">
        <AlertDialog open={open} onOpenChange={onOpenChange} busy={busy}>
          <AlertDialog.Trigger>Delete</AlertDialog.Trigger>
          <Contents onAction={action} error={error} />
        </AlertDialog>
      </AITheme>
    );
    const { rerender } = render(view());
    await user.click(screen.getByRole('button', { name: 'Delete view' }));
    expect(action).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeVisible();
    rerender(view(true));
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Delete view' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Keep view' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Delete view' }));
    expect(action).toHaveBeenCalledOnce();
    rerender(view(false, 'The host rejected this request.'));
    expect(screen.getByRole('alert')).toHaveTextContent('The host rejected this request.');
    expect(screen.getByRole('button', { name: 'Delete view' })).toBeEnabled();
    expect(screen.getByRole('alertdialog').closest('[data-appearance]')).toHaveAttribute(
      'data-appearance',
      'dark',
    );
    rerender(view(false, undefined, false));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps uncontrolled actions open while Escape remains an explicit dismissal', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <AlertDialog defaultOpen>
        <AlertDialog.Trigger>Delete</AlertDialog.Trigger>
        <Contents onAction={action} />
      </AlertDialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete view' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus());
  });

  it('preserves custom initial focus and cleans up body locking/background exclusion on unmount', async () => {
    const beforePointerEvents = document.body.style.pointerEvents;
    const ref = createRef<HTMLDivElement>();
    const input = createRef<HTMLInputElement>();
    const { unmount } = render(
      <>
        <main data-testid="host">Host content</main>
        <AlertDialog.Root defaultOpen dir="rtl">
          <AlertDialog.Content
            ref={ref}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              input.current?.focus();
            }}
          >
            <AlertDialog.Title>Confirm removal</AlertDialog.Title>
            <AlertDialog.Description>Type the view name.</AlertDialog.Description>
            <input ref={input} aria-label="View name" />
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </>,
    );
    await waitFor(() => expect(input.current).toHaveFocus());
    expect(ref.current).toBe(screen.getByRole('alertdialog'));
    expect(ref.current).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('host').closest('[aria-hidden="true"]')).not.toBeNull();
    unmount();
    expect(document.body.style.pointerEvents).toBe(beforePointerEvents);
    expect(document.querySelector('[data-radix-focus-guard]')).toBeNull();
  });
});
