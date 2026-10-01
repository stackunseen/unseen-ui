import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Tooltip } from './tooltip.js';

describe('website Tooltip', () => {
  it('associates supplementary text on keyboard focus and dismisses without moving focus', async () => {
    const user = userEvent.setup();
    render(
      <AITheme appearance="dark">
        <Tooltip>
          <Tooltip.Trigger>Export</Tooltip.Trigger>
          <Tooltip.Content>Downloads the visible rows as CSV.</Tooltip.Content>
        </Tooltip>
      </AITheme>,
    );
    const trigger = screen.getByRole('button', { name: 'Export' });
    await user.tab();
    const tooltip = await screen.findByRole('tooltip');
    expect(trigger).toHaveAccessibleDescription('Downloads the visible rows as CSV.');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(tooltip.closest('[data-appearance]')).toHaveAttribute('data-appearance', 'dark');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('uses provider delays for hover and cleans up pending opening on unmount', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { unmount } = render(
      <Tooltip.Provider delayDuration={40} skipDelayDuration={0}>
        <Tooltip onOpenChange={onOpenChange} disableHoverableContent>
          <Tooltip.Trigger>Copy</Tooltip.Trigger>
          <Tooltip.Content>Copy the identifier.</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>,
    );
    await user.hover(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await screen.findByRole('tooltip');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.unhover(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    onOpenChange.mockClear();
    await user.hover(screen.getByRole('button'));
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps host-controlled content open until the host accepts the close request', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const contentRef = createRef<HTMLDivElement>();
    render(
      <Tooltip.Root open onOpenChange={onOpenChange} dir="rtl">
        <Tooltip.Trigger>Help</Tooltip.Trigger>
        <Tooltip.Content ref={contentRef} aria-label="Shortcut help">
          Press Control plus K.
        </Tooltip.Content>
      </Tooltip.Root>,
    );
    expect(screen.getByRole('tooltip', { name: 'Shortcut help' })).toBeInTheDocument();
    expect(contentRef.current).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('button', { name: 'Help' })).toHaveAttribute('dir', 'rtl');
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
