import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { ContextMenu } from './context-menu.js';

describe('ContextMenu', () => {
  it.each(['{Shift>}{F10}{/Shift}', '{ContextMenu}'])(
    'opens through %s and restores focus after Escape',
    async (keys) => {
      const user = userEvent.setup();
      const change = vi.fn();
      render(
        <AITheme appearance="dark">
          <ContextMenu.Root onOpenChange={change}>
            <ContextMenu.Trigger>Document preview</ContextMenu.Trigger>
            <ContextMenu.Content aria-label="Document actions">
              <ContextMenu.Item>Copy</ContextMenu.Item>
              <ContextMenu.Item disabled>Unavailable</ContextMenu.Item>
              <ContextMenu.Item>Rename</ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Root>
        </AITheme>,
      );
      const trigger = screen.getByText('Document preview');
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard(keys);
      expect(change).toHaveBeenLastCalledWith(true);
      expect(
        screen.getByRole('menu', { name: 'Document actions' }).closest('[data-appearance]'),
      ).toHaveAttribute('data-appearance', 'dark');
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus());
      await user.keyboard('{Escape}');
      await waitFor(() => expect(trigger).toHaveFocus());
      expect(change).toHaveBeenLastCalledWith(false);
    },
  );

  it('opens at the context target and closes on selection', async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    render(
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <button>Preview actions</button>
        </ContextMenu.Trigger>
        <ContextMenu.Content aria-label="Preview">
          <ContextMenu.Item onSelect={select}>Copy</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Preview actions' });
    fireEvent.contextMenu(trigger, { clientX: 12, clientY: 24 });
    await user.click(screen.getByRole('menuitem', { name: 'Copy' }));
    expect(select).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('respects canceled trigger events and disabled triggers', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ContextMenu.Root>
        <ContextMenu.Trigger onKeyDown={(event) => event.preventDefault()}>
          Canceled
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Copy</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    );
    await user.tab();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rerender(
      <ContextMenu.Root>
        <ContextMenu.Trigger disabled>Disabled target</ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Copy</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    );
    fireEvent.contextMenu(screen.getByText('Disabled target'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByText('Disabled target')).toHaveAttribute('tabindex', '-1');
  });

  it('handles the focused target once without opening an ancestor context menu', async () => {
    const user = userEvent.setup();
    const outerContext = vi.fn();
    const outerKeys = vi.fn();
    render(
      <div onContextMenu={outerContext} onKeyDown={outerKeys}>
        <ContextMenu.Root>
          <ContextMenu.Trigger>Nested target</ContextMenu.Trigger>
          <ContextMenu.Content aria-label="Nested actions">
            <ContextMenu.Item>Copy</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      </div>,
    );
    await user.tab();
    outerKeys.mockClear();
    await user.keyboard('{ContextMenu}');
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(outerContext).not.toHaveBeenCalled();
    expect(outerKeys).not.toHaveBeenCalled();
  });

  it('renders controlled checkbox/radio choices and RTL submenus', async () => {
    const user = userEvent.setup();
    const checked = vi.fn();
    render(
      <ContextMenu.Root dir="rtl">
        <ContextMenu.Trigger>RTL preview</ContextMenu.Trigger>
        <ContextMenu.Content aria-label="Preview">
          <ContextMenu.CheckboxItem
            checked
            onCheckedChange={checked}
            onSelect={(event) => event.preventDefault()}
          >
            Guides
          </ContextMenu.CheckboxItem>
          <ContextMenu.Group aria-label="Export">
            <ContextMenu.Label>Formats</ContextMenu.Label>
            <ContextMenu.RadioGroup value="pdf">
              <ContextMenu.RadioItem value="pdf">PDF</ContextMenu.RadioItem>
            </ContextMenu.RadioGroup>
          </ContextMenu.Group>
          <ContextMenu.Separator />
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger>More</ContextMenu.SubTrigger>
            <ContextMenu.SubContent>
              <ContextMenu.Item>Inspect</ContextMenu.Item>
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    );
    await user.tab();
    await user.keyboard('{ContextMenu}');
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Guides' }));
    expect(checked).toHaveBeenCalledWith(false);
    expect(screen.getByRole('menuitemradio', { name: 'PDF' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    screen.getByRole('menuitem', { name: 'More' }).focus();
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Inspect' })).toHaveFocus());
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'More' })).toHaveFocus());
  });
});
