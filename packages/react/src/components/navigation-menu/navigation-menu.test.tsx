import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NavigationMenu } from './navigation-menu.js';

describe('NavigationMenu', () => {
  function Demo({ dir = 'ltr' }: { dir?: 'ltr' | 'rtl' }) {
    return (
      <NavigationMenu.Root aria-label="Website" dir={dir}>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="/" active>
              Home
            </NavigationMenu.Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item value="products">
            <NavigationMenu.Trigger>Products</NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <NavigationMenu.Link href="/products/editor">Editor</NavigationMenu.Link>
              <NavigationMenu.Link asChild>
                <a href="/products/components">Components</a>
              </NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger disabled>Unavailable</NavigationMenu.Trigger>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <NavigationMenu.Link href="/about">About</NavigationMenu.Link>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    );
  }

  it('uses navigation/list/link semantics, current-page state and router composition', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.getByRole('navigation', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Products' }));
    expect(screen.getByRole('group', { name: 'Products' })).toContainElement(
      screen.getByRole('link', { name: 'Components' }),
    );
    expect(screen.getByRole('link', { name: 'Components' })).toHaveAttribute(
      'href',
      '/products/components',
    );
    expect(screen.getByRole('navigation').querySelector('a a, button a, button button')).toBeNull();
  });

  it.each(['ltr', 'rtl'] as const)(
    'keeps natural Tab movement off the hidden proxy in %s navigation',
    async (dir) => {
      const user = userEvent.setup();
      render(<Demo dir={dir} />);
      const trigger = screen.getByRole('button', { name: 'Products' });
      trigger.focus();
      await user.keyboard('{Enter}');
      await user.tab();
      expect(screen.getByRole('link', { name: 'Editor' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('link', { name: 'Components' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('link', { name: 'About' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('link', { name: 'Components' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('link', { name: 'Editor' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(trigger).toHaveFocus();
    },
  );

  it.each(['ltr', 'rtl'] as const)(
    'supports %s arrow navigation, disclosure focus and Escape',
    async (dir) => {
      const user = userEvent.setup();
      render(<Demo dir={dir} />);
      await user.tab();
      expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
      await user.keyboard(dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}');
      const trigger = screen.getByRole('button', { name: 'Products' });
      await waitFor(() => expect(trigger).toHaveFocus());
      await user.keyboard('{Enter}{ArrowDown}');
      await waitFor(() => expect(screen.getByRole('link', { name: 'Editor' })).toHaveFocus());
      await user.keyboard('{Escape}');
      await waitFor(() => expect(trigger).toHaveFocus());
      expect(screen.queryByRole('link', { name: 'Editor' })).not.toBeInTheDocument();
      await user.keyboard(dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}');
      await waitFor(() => expect(screen.getByRole('link', { name: 'About' })).toHaveFocus());
    },
  );

  it.each(['ltr', 'rtl'] as const)(
    'focuses a named empty panel instead of a hidden proxy in %s navigation',
    async (dir) => {
      const user = userEvent.setup();
      render(
        <NavigationMenu.Root dir={dir}>
          <NavigationMenu.List>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger>Resources</NavigationMenu.Trigger>
              <NavigationMenu.Content>
                <p>No resources available</p>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link href="/about">About</NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>,
      );
      const trigger = screen.getByRole('button', { name: 'Resources' });
      trigger.focus();
      await user.keyboard('{Enter}');
      const content = screen.getByRole('group', { name: 'Resources' });
      await user.tab();
      await waitFor(() => expect(content).toHaveFocus());
      await user.tab();
      expect(screen.getByRole('link', { name: 'About' })).toHaveFocus();
      await user.tab({ shift: true });
      await waitFor(() => expect(content).toHaveFocus());
      await user.tab({ shift: true });
      expect(trigger).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    },
  );

  it('recovers focus stranded on a hidden proxy without changing its primitive attributes', async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Products' }));
    screen.getByRole('link', { name: 'Editor' }).focus();
    const proxy = container.querySelector<HTMLElement>('span[aria-hidden="true"][tabindex="0"]')!;
    proxy.focus();
    await waitFor(() => expect(screen.getByRole('group', { name: 'Products' })).toHaveFocus());
    expect(proxy).toHaveAttribute('aria-hidden', 'true');
    expect(proxy).toHaveAttribute('tabindex', '0');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Products' })).toHaveFocus();
  });

  it('preserves content ref and asChild composition across disclosure mounts', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger>Resources</NavigationMenu.Trigger>
            <NavigationMenu.Content asChild ref={ref}>
              <div>
                <p>Loading resources</p>
              </div>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>,
    );
    expect(ref.current).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Resources' }));
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Resources' }));
    await user.keyboard('{Escape}');
    expect(ref.current).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Resources' }));
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Resources' }));
  });

  it('reports controlled disclosure changes without overriding the host value', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const view = (value: string) => (
      <NavigationMenu.Root value={value} onValueChange={change}>
        <NavigationMenu.List>
          <NavigationMenu.Item value="learn">
            <NavigationMenu.Trigger>Learn</NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <NavigationMenu.Link href="/guide">Guide</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
    );
    const { rerender } = render(view(''));
    await user.tab();
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenLastCalledWith('learn');
    expect(screen.queryByRole('link', { name: 'Guide' })).not.toBeInTheDocument();
    rerender(view('learn'));
    expect(screen.getByRole('link', { name: 'Guide' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(change).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('link', { name: 'Guide' })).toBeInTheDocument();
  });
});
