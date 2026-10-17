import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { WorkspaceShell } from './workspace-shell.js';
import { Button } from '../button/button.js';

describe('WorkspaceShell composition', () => {
  it.each(['workspace', 'contained', 'compact'] as const)(
    '%s mounts named slots once and preserves navigation, content and inspector order',
    (variant) => {
      render(
        <WorkspaceShell
          variant={variant}
          label="Search workspace"
          header={<h1>Search project</h1>}
          navigation={<a href="#project">Project files</a>}
          main={<Button>Run search</Button>}
          inspector={<Button>Inspect source</Button>}
          footer={<p>Search ready</p>}
          navigationLabel="Project navigation"
          mainLabel="Search results"
          inspectorLabel="Selected source"
        />,
      );
      const shell = screen.getByRole('region', { name: 'Search workspace' });
      const navigation = within(shell).getByRole('navigation', { name: 'Project navigation' });
      const main = within(shell).getByRole('main', { name: 'Search results' });
      const inspector = within(shell).getByRole('complementary', { name: 'Selected source' });
      expect(shell).toHaveAttribute('data-variant', variant);
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(navigation.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(main.compareDocumentPosition(inspector) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(within(main).getByRole('button', { name: 'Run search' })).toBeVisible();
      expect(within(inspector).getByRole('button', { name: 'Inspect source' })).toBeVisible();
      expect(screen.getByText('Search ready')).toBeVisible();
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    },
  );

  it('supports an embedded section and an inspector that owns its own semantics', () => {
    render(
      <main>
        <WorkspaceShell
          mainAs="section"
          mainLabel="Editor"
          main={<p>Current file</p>}
          inspectorAs="div"
          inspector={<aside aria-label="Source sidecar">Source content</aside>}
        />
      </main>,
    );
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Editor' })).toHaveTextContent('Current file');
    expect(screen.getAllByRole('complementary')).toHaveLength(1);
    expect(screen.getByRole('complementary', { name: 'Source sidecar' })).toBeVisible();
  });

  it('omits absent wrappers while retaining valid zero-valued slot content', () => {
    const { container } = render(<WorkspaceShell main={<p>No side panels</p>} footer={0} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(container.querySelector('[data-part="workspace-header"]')).toBeNull();
    expect(container.querySelector('[data-part="workspace-footer"]')).toHaveTextContent('0');
    expect(container.querySelector('[data-part="workspace-body"]')).toHaveAttribute(
      'data-navigation',
      'false',
    );
  });

  it('keeps stateful main content mounted when a controlled inspector opens or closes', async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <WorkspaceShell
          header={<Button onClick={() => setOpen(!open)}>Toggle inspector</Button>}
          main={<input aria-label="Draft" defaultValue="" />}
          inspector={open ? <p>Details</p> : undefined}
        />
      );
    }
    render(<Host />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Draft' }), 'Preserve this draft');
    await userEvent.click(screen.getByRole('button', { name: 'Toggle inspector' }));
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('Preserve this draft');
    expect(screen.getByText('Details')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Toggle inspector' }));
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('Preserve this draft');
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });

  it('makes explicitly scrolling semantic panes keyboard focusable', () => {
    render(
      <WorkspaceShell
        scrollMode="panes"
        navigation={<p>Navigation items</p>}
        main={<p>Long content</p>}
        inspector={<p>Source details</p>}
      />,
    );
    expect(screen.getByRole('navigation')).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('complementary')).toHaveAttribute('tabindex', '0');
  });

  it('lets flow mode keep host scrolling and forwards root attributes', () => {
    render(
      <WorkspaceShell
        id="project"
        className="host-workspace"
        style={{ maxHeight: 500 }}
        main={<p>Document flow</p>}
      />,
    );
    const shell = screen.getByRole('region', { name: 'Workspace' });
    expect(shell).toHaveAttribute('id', 'project');
    expect(shell).toHaveClass('host-workspace');
    expect(shell).toHaveStyle({ maxHeight: '500px' });
    expect(shell).toHaveAttribute('data-scroll-mode', 'flow');
    expect(screen.getByRole('main')).not.toHaveAttribute('tabindex');
  });
});
