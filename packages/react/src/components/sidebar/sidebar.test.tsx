import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar.js';

describe('Sidebar', () => {
  it('composes named groups with native navigation links and active state, without menu semantics', async () => {
    render(
      <Sidebar label="Product">
        <Sidebar.Group label="Workspace">
          <Sidebar.Link href="/overview" current icon={<span>Decorative house</span>}>
            Overview
          </Sidebar.Link>
          <Sidebar.Link href="/inbox" badge="3 unread">
            Inbox
          </Sidebar.Link>
        </Sidebar.Group>
        <Sidebar.Group label="Manage">
          <Sidebar.Link href="/settings">Settings</Sidebar.Link>
        </Sidebar.Group>
      </Sidebar>,
    );
    expect(screen.getByRole('navigation', { name: 'Product' })).toBeVisible();
    expect(
      screen.getAllByRole('group').map((group) => group.getAttribute('aria-labelledby')),
    ).toHaveLength(2);
    expect(
      within(screen.getByRole('group', { name: 'Workspace' })).getAllByRole('link'),
    ).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inbox 3 unread' })).toHaveAttribute('href', '/inbox');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Inbox 3 unread' })).toHaveFocus();
  });

  it('makes disabled links inert for pointer, auxiliary clicks and keyboard tabbing', async () => {
    const click = vi.fn();
    const auxiliary = vi.fn();
    render(
      <Sidebar>
        <Sidebar.Group>
          <Sidebar.Link href="/unavailable" disabled onClick={click} onAuxClick={auxiliary}>
            Unavailable
          </Sidebar.Link>
          <Sidebar.Link href="/available">Available</Sidebar.Link>
        </Sidebar.Group>
      </Sidebar>,
    );
    const disabled = screen.getByRole('link', { name: 'Unavailable' });
    expect(disabled).not.toHaveAttribute('href');
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(disabled);
    fireEvent(disabled, new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
    expect(click).not.toHaveBeenCalled();
    expect(auxiliary).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Available' })).toHaveFocus();
  });

  it('supports embedded navigation, stable refs/focus and host-owned route updates', () => {
    const ref = createRef<HTMLElement>();
    const linkRef = createRef<HTMLAnchorElement>();
    const click = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    const content = (current: boolean) => (
      <nav aria-label="Workspace">
        <Sidebar as="div" ref={ref} dir="rtl">
          <Sidebar.Group>
            <Sidebar.Link ref={linkRef} href="/settings" current={current} onClick={click}>
              Settings
            </Sidebar.Link>
          </Sidebar.Group>
        </Sidebar>
      </nav>
    );
    const { rerender } = render(content(false));
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    const link = screen.getByRole('link', { name: 'Settings' });
    link.focus();
    fireEvent.click(link, { metaKey: true });
    expect(click).toHaveBeenCalledOnce();
    expect(link).not.toHaveAttribute('aria-current');
    rerender(content(true));
    expect(linkRef.current).toBe(link);
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current).toHaveAttribute('dir', 'rtl');
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('accepts an explicit empty message without inventing links', () => {
    render(
      <Sidebar label="Projects">
        <p>No accessible projects</p>
      </Sidebar>,
    );
    expect(screen.getByRole('navigation', { name: 'Projects' })).toHaveTextContent(
      'No accessible projects',
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
