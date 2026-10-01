import { createRef } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Button } from '../button/button.js';
import { Popover } from './popover.js';

describe('website Popover', () => {
  it('opens from the keyboard, labels rich content, preserves themed portals and restores focus', async () => {
    const user = userEvent.setup();
    const triggerRef = createRef<HTMLButtonElement>();
    const contentRef = createRef<HTMLDivElement>();
    const { container } = render(
      <AITheme appearance="dark" config={{ density: 'compact' }}>
        <Popover>
          <Popover.Trigger asChild>
            <Button ref={triggerRef}>Edit display</Button>
          </Popover.Trigger>
          <Popover.Content
            ref={contentRef}
            title="Display options"
            headingLevel={3}
            description="Applies to this view."
          >
            <label>
              Display name
              <input defaultValue="Overview" />
            </label>
            <Popover.Close>Done</Popover.Close>
          </Popover.Content>
        </Popover>
      </AITheme>,
    );
    await user.tab();
    await user.keyboard('{Enter}');
    const content = await screen.findByRole('dialog', { name: 'Display options' });
    expect(content).toHaveAccessibleDescription('Applies to this view.');
    expect(contentRef.current).toBe(content);
    expect(within(content).getByRole('heading', { level: 3 })).toHaveTextContent('Display options');
    expect(content.closest('[data-ai-theme]')?.getAttribute('data-ai-theme')).toBe(
      container.querySelector('[data-ai-theme]')?.getAttribute('data-ai-theme'),
    );
    expect(content.closest('[data-appearance]')).toHaveAttribute('data-appearance', 'dark');
    expect(container).not.toContainElement(content);
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(triggerRef.current).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not overwrite a controlled open value when dismissal is requested', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const view = (open: boolean) => (
      <Popover open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger>Details</Popover.Trigger>
        <Popover.Content title="Details">
          <Popover.Close>Close details</Popover.Close>
        </Popover.Content>
      </Popover>
    );
    const { rerender } = render(view(true));
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('dialog')).toBeVisible();
    rerender(view(false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports prevented autofocus/dismissal without swallowing host event callbacks', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn((event: KeyboardEvent) => event.preventDefault());
    render(
      <Popover>
        <Popover.Trigger>Options</Popover.Trigger>
        <Popover.Content
          title="Options"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={onEscape}
        >
          <button>First action</button>
        </Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Options' });
    await user.click(trigger);
    expect(trigger).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('respects disabled triggers, custom portal containers, RTL and outside dismissal', async () => {
    const user = userEvent.setup();
    const portal = document.createElement('div');
    document.body.appendChild(portal);
    const { rerender, unmount } = render(
      <Popover>
        <Popover.Trigger disabled>Unavailable</Popover.Trigger>
        <Popover.Content title="Unavailable">Details</Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(
      <>
        <button>Outside</button>
        <Popover.Root defaultOpen dir="rtl">
          <Popover.Trigger>Preferences</Popover.Trigger>
          <Popover.Content title="Preferences" container={portal}>
            <Popover.Close>Done</Popover.Close>
          </Popover.Content>
        </Popover.Root>
      </>,
    );
    const content = screen.getByRole('dialog');
    expect(portal).toContainElement(content);
    expect(content).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('button', { name: 'Preferences' })).toHaveAttribute('dir', 'rtl');
    expect(content).not.toHaveAttribute('aria-describedby');
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
    unmount();
    portal.remove();
  });
});
