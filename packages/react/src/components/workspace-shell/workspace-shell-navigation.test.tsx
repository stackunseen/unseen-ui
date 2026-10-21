import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceShell } from './workspace-shell.js';

// jsdom has no layout: stand in a width for the shell and a ResizeObserver that reports it.
function setWidth(width: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 600,
    top: 0,
    left: 0,
    right: width,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: () => void) {}
      observe() {
        this.callback();
      }
      disconnect() {}
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Demo({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <WorkspaceShell
      navigationMode="responsive"
      navigationOpen={open}
      onNavigationOpenChange={setOpen}
      navigationToggleLabel="Chats"
      header={<span>Title</span>}
      navigation={
        <>
          <a href="#one">First chat</a>
          <a href="#two">Second chat</a>
        </>
      }
      main={<button type="button">Composer</button>}
    />
  );
}

describe('WorkspaceShell responsive navigation', () => {
  it('collapses and restores the navigation column on wide layouts', async () => {
    setWidth(1200);
    const user = userEvent.setup();
    render(<Demo />);
    const toggle = screen.getByRole('button', { name: 'Chats' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation')).toBeVisible();
    expect(document.querySelector('[data-part="workspace-shell"]')).toHaveAttribute(
      'data-navigation-mode',
      'collapsible',
    );
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
    await user.click(toggle);
    expect(screen.getByRole('navigation')).toBeVisible();
  });

  it('opens a drawer on narrow layouts that takes focus, closes on Escape and returns focus', async () => {
    setWidth(400);
    const user = userEvent.setup();
    render(<Demo initialOpen={false} />);
    const toggle = screen.getByRole('button', { name: 'Chats' });
    expect(screen.queryByRole('navigation')).toBeNull();
    await user.click(toggle);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('data-drawer');
    expect(screen.getByRole('link', { name: 'First chat' })).toHaveFocus();
    // The content behind the drawer is out of reach until it closes.
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(toggle).toHaveFocus();
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
  });

  it('closes the drawer from the scrim or after following a link', async () => {
    setWidth(400);
    const user = userEvent.setup();
    render(<Demo initialOpen={false} />);
    const toggle = screen.getByRole('button', { name: 'Chats' });
    await user.click(toggle);
    await user.click(document.querySelector('[data-part="workspace-scrim"]')!);
    expect(screen.queryByRole('navigation')).toBeNull();
    await user.click(toggle);
    await user.click(screen.getByRole('link', { name: 'Second chat' }));
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('switches between drawer and column when the layout resizes', () => {
    let report = () => {};
    let width = 1200;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      width,
      height: 600,
      top: 0,
      left: 0,
      right: width,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Demo />);
    const shell = document.querySelector('[data-part="workspace-shell"]')!;
    expect(shell).toHaveAttribute('data-navigation-mode', 'collapsible');
    width = 500;
    act(() => report());
    expect(shell).toHaveAttribute('data-navigation-mode', 'drawer');
  });

  it('keeps inline mode free of a toggle', () => {
    render(<WorkspaceShell navigation={<a href="#a">A</a>} main={<p>Main</p>} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('navigation')).toBeVisible();
  });

  it('starts closed on a narrow layout and reopens when it widens', () => {
    let report = () => {};
    let width = 400;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      width,
      height: 600,
      top: 0,
      left: 0,
      right: width,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Demo />);
    // Open by default, but the phone layout shows the content first.
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('button', { name: 'Chats' })).not.toHaveFocus();
    width = 1200;
    act(() => report());
    expect(screen.getByRole('navigation')).toBeVisible();
  });

  it('places the header above the main content only', () => {
    setWidth(1200);
    render(
      <WorkspaceShell
        navigationMode="responsive"
        headerPlacement="main"
        navigationOpen
        onNavigationOpenChange={() => {}}
        header={<span>Model picker</span>}
        navigation={<a href="#a">A</a>}
        main={<p>Messages</p>}
      />,
    );
    const column = document.querySelector('[data-part="workspace-main-column"]')!;
    expect(column.querySelector('[data-part="workspace-header"]')).toHaveTextContent(
      'Model picker',
    );
    expect(column.querySelector('main')).toHaveTextContent('Messages');
    expect(screen.getByRole('navigation').contains(column)).toBe(false);
  });
});
