import { createRef, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Button } from '../button/button.js';
import { Modal } from '../modal/modal.js';
import { DropdownMenu } from './dropdown-menu.js';

describe('DropdownMenu', () => {
  it('opens from the keyboard, skips disabled items, supports typeahead and returns focus', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AITheme appearance="dark">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>File actions</DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Label>Document</DropdownMenu.Label>
            <DropdownMenu.Item>Archive</DropdownMenu.Item>
            <DropdownMenu.Item disabled>Blocked</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={onSelect}>Duplicate</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </AITheme>,
    );
    const trigger = screen.getByRole('button', { name: 'File actions' });
    await user.tab();
    await user.keyboard('{Enter}');
    const menu = screen.getByRole('menu', { name: 'File actions' });
    expect(menu.closest('[data-ai-theme]')?.getAttribute('data-ai-theme')).toBe(
      trigger.closest('[data-ai-theme]')?.getAttribute('data-ai-theme'),
    );
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
    await user.keyboard('{Home}d');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps controlled open state until accepted and lets selection stay open', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const view = (open: boolean) => (
      <DropdownMenu.Root open={open} onOpenChange={change}>
        <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={(event) => event.preventDefault()}>
            Inspect
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    );
    const { rerender } = render(view(false));
    await user.tab();
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rerender(view(true));
    await user.click(screen.getByRole('menuitem', { name: 'Inspect' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(change).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    rerender(view(false));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('announces mixed checkbox and radio state without taking ownership of host values', async () => {
    const user = userEvent.setup();
    const checked = vi.fn();
    const value = vi.fn();
    render(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>View options</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem
            checked="indeterminate"
            onCheckedChange={checked}
            onSelect={(event) => event.preventDefault()}
          >
            Show guides
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Separator />
          <DropdownMenu.RadioGroup value="small" onValueChange={value} aria-label="Size">
            <DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="large" onSelect={(event) => event.preventDefault()}>
              Large
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    const checkbox = screen.getByRole('menuitemcheckbox', { name: 'Show guides' });
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
    await user.click(checkbox);
    expect(checked).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
    await user.click(screen.getByRole('menuitemradio', { name: 'Large' }));
    expect(value).toHaveBeenCalledWith('large');
    expect(screen.getByRole('menuitemradio', { name: 'Small' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it.each(['ltr', 'rtl'] as const)(
    'opens a %s submenu with logical arrows and closes to its parent',
    async (dir) => {
      const user = userEvent.setup();
      render(
        <AITheme>
          <DropdownMenu.Root dir={dir}>
            <DropdownMenu.Trigger>More actions</DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item>PDF</DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </AITheme>,
      );
      await user.tab();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
      await user.keyboard(dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}');
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'PDF' })).toHaveFocus());
      await user.keyboard(dir === 'ltr' ? '{ArrowLeft}' : '{ArrowRight}');
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveFocus());
      expect(screen.queryByRole('menuitem', { name: 'PDF' })).not.toBeInTheDocument();
      await user.keyboard('{Escape}');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'More actions' })).toHaveFocus(),
      );
    },
  );

  it('supports custom trigger/link elements and refs without nested interactive elements', async () => {
    const user = userEvent.setup();
    const triggerRef = createRef<HTMLButtonElement>();
    let linkElement: HTMLElement | null = null;
    const { container } = render(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild ref={triggerRef}>
          <Button>Resources</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            asChild
            ref={(element) => {
              linkElement = element;
            }}
          >
            <a href="/documentation">Documentation</a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Resources' });
    await user.tab();
    await user.keyboard('{Enter}');
    expect(triggerRef.current).toBe(trigger);
    expect(linkElement).toHaveAttribute('href', '/documentation');
    expect(container.querySelector('button button')).toBeNull();
    expect(screen.getByRole('menu').querySelector('a a, a button')).toBeNull();
  });

  it('does not open a disabled trigger or activate disabled actions', async () => {
    const user = userEvent.setup();
    const selected = vi.fn();
    const { rerender } = render(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger disabled>Unavailable actions</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item>Hidden</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rerender(
      <DropdownMenu.Root defaultOpen>
        <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item disabled onSelect={selected}>
            Unavailable
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );
    await user.tab();
    await user.keyboard('{Enter}');
    const item = screen.getByRole('menuitem', { name: 'Unavailable' });
    fireEvent.click(item);
    expect(selected).not.toHaveBeenCalled();
  });

  it('supports an empty menu, removes modal pointer locks on unmount, and uses a custom portal host', async () => {
    const portal = document.createElement('div');
    document.body.append(portal);
    const { unmount } = render(
      <AITheme appearance="dark">
        <DropdownMenu.Root defaultOpen>
          <DropdownMenu.Trigger>Empty actions</DropdownMenu.Trigger>
          <DropdownMenu.Content container={portal}>
            <DropdownMenu.Label>No available actions</DropdownMenu.Label>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </AITheme>,
    );
    expect(within(portal).getByRole('menu')).toHaveTextContent('No available actions');
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    unmount();
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'));
    expect(portal).toBeEmptyDOMElement();
    portal.remove();
  });

  it('dismisses nested menus before their enclosing modal', async () => {
    const user = userEvent.setup();
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <AITheme>
          <Modal
            open={open}
            onOpenChange={setOpen}
            title="Document"
            description="Document controls"
            trigger={<Button>Open document</Button>}
          >
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Modal>
        </AITheme>
      );
    }
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Open document' }));
    const trigger = screen.getByRole('button', { name: 'Actions' });
    trigger.focus();
    await user.keyboard('{Enter}{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open document' })).toHaveFocus(),
    );
  });
});
