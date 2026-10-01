import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Button } from '../button/button.js';
import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastViewport,
} from './toast.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ToastDemo({
  duration = Infinity,
  onOpenChange,
  type = 'background',
}: {
  duration?: number;
  onOpenChange?: (open: boolean) => void;
  type?: 'background' | 'foreground';
}) {
  const [open, setOpen] = useState(true);
  return (
    <ToastProvider duration={duration}>
      <Button onClick={() => setOpen(true)}>Notify again</Button>
      <Toast
        open={open}
        onOpenChange={(next) => {
          onOpenChange?.(next);
          setOpen(next);
        }}
        type={type}
      >
        <ToastTitle>Report saved</ToastTitle>
        <ToastDescription>Find the report in your workspace.</ToastDescription>
        <ToastAction altText="Open the Reports page from navigation">View report</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

describe('composed toast notifications', () => {
  it('portals into a themed viewport, leaves current focus alone, and cleans up on unmount', async () => {
    const { unmount, container } = render(
      <AITheme appearance="dark">
        <ToastDemo />
      </AITheme>,
    );
    const title = await screen.findByText('Report saved');
    const viewport = title.closest('ol')!;
    expect(container.contains(viewport)).toBe(false);
    expect(viewport.closest('[data-ai-theme]')).toHaveAttribute('data-appearance', 'dark');
    expect(viewport.closest('[data-ai-theme]')?.getAttribute('data-ai-theme')).toBe(
      container.querySelector('[data-ai-theme]')?.getAttribute('data-ai-theme'),
    );
    expect(document.activeElement).toBe(document.body);
    unmount();
    expect(viewport).not.toBeInTheDocument();
    expect(screen.queryByText('Report saved')).not.toBeInTheDocument();
  });

  it('requests controlled dismissal without hiding until the host accepts it', async () => {
    const change = vi.fn();
    const fixture = (open: boolean) => (
      <ToastProvider duration={Infinity}>
        <Toast open={open} onOpenChange={change}>
          <ToastTitle>Host notice</ToastTitle>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    const { rerender } = render(fixture(true));
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss notification' }));
    expect(change).toHaveBeenCalledWith(false);
    expect(screen.getByText('Host notice')).toBeVisible();
    rerender(fixture(false));
    expect(screen.queryByText('Host notice')).not.toBeInTheDocument();
  });

  it('supports F8 focus access and keyboard activation of optional actions', async () => {
    const action = vi.fn();
    render(
      <ToastProvider duration={Infinity}>
        <Button>Outside</Button>
        <Toast defaultOpen>
          <ToastTitle>Undo available</ToastTitle>
          <ToastAction onClick={action} altText="Restore the file from Trash">
            Undo
          </ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );
    await screen.findByText('Undo available');
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
    // user-event's default key map omits function-key codes; Radix matches event.code.
    fireEvent.keyDown(document, { key: 'F8', code: 'F8' });
    const viewport = screen.getByText('Undo available').closest('ol')!;
    expect(viewport).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Undo available')).not.toBeInTheDocument();
  });

  it('dismisses via Escape without submitting a containing host form', async () => {
    const submit = vi.fn();
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ToastDemo />
      </form>,
    );
    const close = await screen.findByRole('button', { name: 'Dismiss notification' });
    close.focus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Report saved')).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    ['background', 'polite'],
    ['foreground', 'assertive'],
  ] as const)('announces %s notifications with %s priority', async (type, priority) => {
    render(<ToastDemo type={type} />);
    await waitFor(() => {
      const announcement = document.querySelector(`[aria-live="${priority}"]`);
      expect(announcement).toHaveTextContent('Report saved');
      expect(announcement).toHaveTextContent('Open the Reports page from navigation');
    });
  });

  it('supports host-owned layer containers and explicit local RTL direction', async () => {
    const target = document.createElement('div');
    document.body.append(target);
    const { unmount } = render(
      <ToastProvider>
        <Toast duration={Infinity}>
          <ToastTitle>Custom layer</ToastTitle>
        </Toast>
        <ToastViewport container={target} position="top-start" dir="rtl" />
      </ToastProvider>,
    );
    const toast = await within(target).findByText('Custom layer');
    expect(toast.closest('ol')).toHaveAttribute('dir', 'rtl');
    expect(toast.closest('ol')).toHaveAttribute('data-position', 'top-start');
    unmount();
    expect(target).toBeEmptyDOMElement();
    target.remove();
  });
});

describe('toast duration and cleanup', () => {
  it('pauses expiry while focus is inside and resumes the remaining duration', async () => {
    vi.useFakeTimers();
    const change = vi.fn();
    render(<ToastDemo duration={1000} onOpenChange={change} />);
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    const close = screen.getByRole('button', { name: 'Dismiss notification' });
    act(() => {
      close.focus();
    });
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(change).not.toHaveBeenCalled();
    act(() => {
      screen.getByRole('button', { name: 'Notify again' }).focus();
    });
    await act(async () => {
      vi.advanceTimersByTime(799);
    });
    expect(change).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(2);
    });
    expect(change).toHaveBeenCalledWith(false);
  });

  it('pauses on pointer entry and removes expiry callbacks on unmount', async () => {
    vi.useFakeTimers();
    const change = vi.fn();
    const { unmount } = render(<ToastDemo duration={1000} onOpenChange={change} />);
    const viewport = screen.getByText('Report saved').closest('ol')!;
    fireEvent.pointerMove(viewport);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(change).not.toHaveBeenCalled();
    fireEvent.pointerLeave(viewport);
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(change).not.toHaveBeenCalled();
    expect(viewport).not.toBeInTheDocument();
  });

  it.each([0, -100, NaN, Infinity])(
    'avoids immediate dismissal for duration %s',
    async (duration) => {
      vi.useFakeTimers();
      const change = vi.fn();
      render(<ToastDemo duration={duration} onOpenChange={change} />);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(change).not.toHaveBeenCalled();
      expect(screen.getByText('Report saved')).toBeVisible();
    },
  );
});
