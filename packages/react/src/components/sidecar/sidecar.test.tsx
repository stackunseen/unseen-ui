import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AITheme, Button, IconButton, IconsProvider, Select } from '@stackunseen/ui';
import { Sidecar } from './sidecar.js';
import { SplitPane } from '../split-pane/split-pane.js';
import type { SidecarPresentation } from './sidecar.js';

const presentations: SidecarPresentation[] = ['docked', 'drawer', 'overlay'];
function mediaState(initial = false) {
  let narrow = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return narrow;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  return {
    set(value: boolean) {
      act(() => {
        narrow = value;
        listeners.forEach((notify) => notify());
      });
    },
    listeners,
  };
}
afterEach(() => vi.unstubAllGlobals());

describe('Sidecar controlled compositions', () => {
  it.each(presentations)(
    '%s requests opening without changing the controlled value',
    async (presentation) => {
      const onOpenChange = vi.fn();
      render(
        <Sidecar
          open={false}
          onOpenChange={onOpenChange}
          title="Evidence"
          presentation={presentation}
          trigger={<Button>Inspect evidence</Button>}
        >
          <p>Private panel content</p>
        </Sidecar>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Inspect evidence' }));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
      expect(screen.queryByText('Private panel content')).toBeNull();
    },
  );
  it.each(presentations)(
    '%s keeps title, description, body and footer in one labeled panel',
    async (presentation) => {
      const onOpenChange = vi.fn();
      const ref = createRef<HTMLElement>();
      const props = {
        open: true,
        onOpenChange,
        title: 'Evidence details',
        description: 'Current source versions',
        presentation,
        headingLevel: 3 as const,
        mobileBreakpoint: false as const,
      };
      const { rerender, container } = render(
        <AITheme>
          <Sidecar
            {...props}
            ref={ref}
            actions={<IconButton icon="copy" label="Copy source" />}
            toolbar={
              <Button size="sm" variant="ghost">
                Filter sources
              </Button>
            }
            footer={<Button>Open source</Button>}
          >
            <p>Verified source excerpt</p>
          </Sidecar>
        </AITheme>,
      );
      const panel = screen.getByRole(presentation === 'drawer' ? 'dialog' : 'complementary', {
        name: 'Evidence details',
      });
      expect(panel).toHaveAccessibleDescription('Current source versions');
      expect(panel.tagName).toBe(presentation === 'drawer' ? 'DIV' : 'ASIDE');
      expect(
        within(panel).getByRole('heading', { level: 3, name: 'Evidence details' }),
      ).toBeVisible();
      expect(
        within(panel).getByRole('region', { name: 'Evidence details content' }),
      ).toHaveAttribute('tabindex', '0');
      expect(ref.current).toBe(panel);
      expect(document.querySelectorAll('[data-sidecar]')).toHaveLength(1);
      expect(
        within(panel)
          .getAllByRole('button')
          .map((button) => button.textContent || button.getAttribute('aria-label')),
      ).toEqual(['Copy source', 'Close panel', 'Filter sources', 'Open source']);
      if (presentation === 'drawer') expect(panel).toHaveAttribute('aria-modal', 'true');
      else expect(panel).not.toHaveAttribute('aria-modal');
      await userEvent.click(within(panel).getByRole('button', { name: 'Close panel' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(panel).toBeVisible();
      rerender(
        <AITheme>
          <Sidecar {...props} open={false} ref={ref}>
            <p>Verified source excerpt</p>
          </Sidecar>
        </AITheme>,
      );
      expect(document.querySelectorAll('[data-sidecar]')).toHaveLength(0);
      expect(container).not.toHaveTextContent('Verified source excerpt');
      expect(ref.current).toBeNull();
    },
  );
  it('lets docked Tab order leave the panel and does not close when working outside', async () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <Button>Before panel</Button>
        <Sidecar open onOpenChange={onOpenChange} title="File inspector" mobileBreakpoint={false}>
          <label>
            Note
            <input aria-label="Note" />
          </label>
        </Sidecar>
        <Button>After panel</Button>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Note' });
    input.focus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After panel' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Before panel' }));
    expect(screen.getByRole('complementary')).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
  it('lets a floating non-modal inspector retain outside work and avoids stealing focus on host closure', async () => {
    const onOpenChange = vi.fn();
    const props = {
      open: true,
      onOpenChange,
      title: 'Activity inspector',
      presentation: 'overlay' as const,
      mobileBreakpoint: false as const,
    };
    const { rerender } = render(
      <>
        <Sidecar {...props}>
          <p>Public activity</p>
        </Sidecar>
        <Button>Continue in editor</Button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue in editor' }));
    expect(screen.getByRole('button', { name: 'Continue in editor' })).toHaveFocus();
    expect(screen.getByRole('complementary')).toBeVisible();
    rerender(
      <>
        <Sidecar {...props} open={false}>
          <p>Public activity</p>
        </Sidecar>
        <Button>Continue in editor</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Continue in editor' })).toHaveFocus();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
  it('traps modal focus, supports Escape and returns to its trigger after controlled acknowledgement', async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Sidecar
            open={open}
            onOpenChange={setOpen}
            title="Review artifact"
            presentation="drawer"
            trigger={<Button>Inspect artifact</Button>}
            footer={<Button>Open artifact</Button>}
          >
            <input aria-label="Artifact note" />
          </Sidecar>
          <Button>Outside editor action</Button>
        </>
      );
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Inspect artifact' });
    const outside = screen.getByRole('button', { name: 'Outside editor action' });
    await userEvent.click(trigger);
    const panel = screen.getByRole('dialog', { name: 'Review artifact' });
    expect(panel).toHaveFocus();
    act(() => outside.focus());
    await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
    within(panel).getByRole('button', { name: 'Open artifact' }).focus();
    await userEvent.tab();
    expect(within(panel).getByRole('button', { name: 'Close panel' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('honors explicit initial/return targets without requiring a built-in trigger', async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      const opener = useRef<HTMLButtonElement>(null);
      const editor = useRef<HTMLInputElement>(null);
      return (
        <>
          <Button ref={opener} onClick={() => setOpen(true)}>
            Inspect file
          </Button>
          <Sidecar
            open={open}
            onOpenChange={setOpen}
            title="File notes"
            presentation="drawer"
            initialFocusRef={editor}
            returnFocusRef={opener}
          >
            <input ref={editor} aria-label="File note" />
          </Sidecar>
        </>
      );
    }
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Inspect file' });
    await userEvent.click(opener);
    expect(screen.getByRole('textbox', { name: 'File note' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });
  it('adapts one docked panel to a drawer, preserves host values and keeps focus in the changed panel', async () => {
    const media = mediaState();
    const onOpenChange = vi.fn();
    render(
      <Sidecar open onOpenChange={onOpenChange} title="Workspace details">
        <input aria-label="Selected file" value="src/main.tsx" onChange={() => {}} />
      </Sidecar>,
    );
    screen.getByRole('textbox', { name: 'Selected file' }).focus();
    media.set(true);
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveAttribute('data-presentation', 'drawer'),
    );
    expect(document.querySelectorAll('[data-sidecar]')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Selected file' })).toHaveValue('src/main.tsx');
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    media.set(false);
    await waitFor(() =>
      expect(screen.getByRole('complementary')).toHaveAttribute('data-presentation', 'docked'),
    );
    expect(document.querySelectorAll('[data-sidecar]')).toHaveLength(1);
    expect(screen.getByRole('complementary').contains(document.activeElement)).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
  it('disables responsive adaptation explicitly and removes its media subscription on unmount', () => {
    const media = mediaState(true);
    const { rerender, unmount } = render(
      <Sidecar open onOpenChange={() => {}} title="Responsive panel">
        <p>Details</p>
      </Sidecar>,
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(media.listeners.size).toBe(1);
    rerender(
      <Sidecar open onOpenChange={() => {}} title="Responsive panel" mobileBreakpoint={false}>
        <p>Details</p>
      </Sidecar>,
    );
    expect(screen.getByRole('complementary')).toBeVisible();
    expect(media.listeners.size).toBe(0);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
  it('uses a deterministic docked server snapshot without invoking matchMedia', () => {
    mediaState(true);
    const html = renderToString(
      <Sidecar open onOpenChange={() => {}} title="Server inspector">
        <p>Server content</p>
      </Sidecar>,
    );
    expect(html).toContain('data-presentation="docked"');
    expect(html).toContain('role="complementary"');
    expect(html).toContain('Server content');
    expect(window.matchMedia).not.toHaveBeenCalled();
  });
  it('keeps long headings and null close glyphs named while secondary actions remain disabled', async () => {
    const title = 'Review '.repeat(40);
    const close = vi.fn();
    render(
      <IconsProvider icons={{ close: null }}>
        <Sidecar
          open
          onOpenChange={close}
          title={title}
          description="Long localized details"
          headingLevel={4}
          mobileBreakpoint={false}
          closeLabel="Close source inspector"
          actions={<IconButton icon="copy" label="Copy source citation" disabled />}
        >
          <p>Source content</p>
        </Sidecar>
      </IconsProvider>,
    );
    expect(screen.getByRole('heading', { name: title.trim(), level: 4 })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy source citation' })).toBeDisabled();
    const action = screen.getByRole('button', { name: 'Close source inspector' });
    expect(action).toHaveTextContent('Close source inspector');
    action.focus();
    await userEvent.keyboard('{Enter}');
    expect(close).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('protects a docked inspector when its nested Select consumes Escape', async () => {
    const close = vi.fn();
    function Example() {
      const [value, setValue] = useState('current');
      return (
        <Sidecar open onOpenChange={close} title="Source inspector" mobileBreakpoint={false}>
          <Select
            aria-label="Source version"
            value={value}
            onValueChange={setValue}
            options={[
              { value: 'current', label: 'Current' },
              { value: 'previous', label: 'Previous' },
            ]}
          />
        </Sidecar>
      );
    }
    render(<Example />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Source version' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('complementary')).toBeVisible();
    expect(close).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(close).toHaveBeenCalledExactlyOnceWith(false));
  });
  it('lets a host prevent Escape while a local draft requires a decision', async () => {
    const close = vi.fn();
    render(
      <Sidecar
        open
        onOpenChange={close}
        title="Review draft"
        mobileBreakpoint={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <input aria-label="Draft" />
      </Sidecar>,
    );
    screen.getByRole('textbox', { name: 'Draft' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(close).not.toHaveBeenCalled();
  });
  it('returns to the explicit opener when a controlled SplitPane unmounts the closing docked panel', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    function Example() {
      const [open, setOpen] = useState(true);
      const opener = useRef<HTMLButtonElement>(null);
      return (
        <>
          <Button ref={opener} onClick={() => setOpen(true)}>
            Open inspector
          </Button>
          <SplitPane
            label="Workspace layout"
            sizes={open ? [70, 30] : [100, 0]}
            primary={{
              id: 'conversation',
              label: 'Conversation',
              children: <Button>Continue conversation</Button>,
            }}
            secondary={{
              id: 'inspector',
              label: 'Inspector',
              collapsible: true,
              children: (
                <Sidecar
                  open={open}
                  onOpenChange={setOpen}
                  title="Workspace inspector"
                  returnFocusRef={opener}
                  mobileBreakpoint={false}
                >
                  <p>Inspector content</p>
                </Sidecar>
              ),
            }}
          />
        </>
      );
    }
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open inspector' })).toHaveFocus(),
    );
    expect(screen.getByRole('separator')).not.toHaveFocus();
  });
  it('does not return to the opener during inline/portal presentation replacement', async () => {
    const opener = createRef<HTMLButtonElement>();
    const props = {
      open: true,
      onOpenChange: vi.fn(),
      title: 'Inspector',
      returnFocusRef: opener,
      mobileBreakpoint: false as const,
    };
    const example = (presentation: SidecarPresentation) => (
      <>
        <Button ref={opener}>Inspect</Button>
        <Sidecar {...props} presentation={presentation}>
          <input aria-label="Inspector draft" value="Controlled note" onChange={() => {}} />
        </Sidecar>
      </>
    );
    const { rerender } = render(example('docked'));
    screen.getByRole('textbox', { name: 'Inspector draft' }).focus();
    rerender(example('drawer'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    expect(opener.current).not.toHaveFocus();
    rerender(example('docked'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('complementary').contains(document.activeElement)).toBe(true);
    expect(opener.current).not.toHaveFocus();
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });
});
