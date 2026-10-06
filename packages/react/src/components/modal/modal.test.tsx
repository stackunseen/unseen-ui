import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../button/button.js';
import { Modal } from './modal.js';

describe('Modal', () => {
  it('keeps the children-only dialog named, described and keyboard controlled', async () => {
    const user = userEvent.setup();
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Project details"
          description="Review the selected project."
          trigger={<Button>Open project</Button>}
        >
          <p>Existing children remain in the dialog.</p>
          <Button>Inspect file</Button>
        </Modal>
      );
    }
    render(<Demo />);
    const trigger = screen.getByRole('button', { name: 'Open project' });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Project details' });
    expect(dialog).toHaveAccessibleDescription('Review the selected project.');
    expect(within(dialog).getByText('Existing children remain in the dialog.')).toBeVisible();
    expect(dialog.querySelector('[data-slot="modal-footer"]')).toBeNull();
    const close = within(dialog).getByRole('button', { name: 'Close panel' });
    await waitFor(() => expect(close).toHaveFocus());
    await user.tab();
    expect(within(dialog).getByRole('group', { name: 'Project details content' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Inspect file' })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it.each(['dialog', 'sheet', 'fullscreen'] as const)(
    'preserves the accessible name with a custom %s header and host-owned footer actions',
    async (layout) => {
      const user = userEvent.setup();
      const onInspect = vi.fn();
      const onApply = vi.fn();
      render(
        <Modal
          layout={layout}
          open
          onOpenChange={vi.fn()}
          title="Review changes"
          description="Only the host can apply these changes."
          trigger={<Button>Open review</Button>}
          header={<Button onClick={onInspect}>Inspect scope</Button>}
          footer={<Button onClick={onApply}>Request apply</Button>}
          className="project-review"
          style={{ width: 560 }}
        >
          <p>Change details</p>
        </Modal>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Review changes' });
      expect(dialog).toHaveAccessibleDescription('Only the host can apply these changes.');
      expect(dialog).toHaveClass('project-review');
      expect(dialog).toHaveStyle({ width: '560px' });
      expect(dialog).toHaveAttribute('data-layout', layout);
      const body = within(dialog).getByRole('group', { name: 'Review changes content' });
      const inspect = within(dialog).getByRole('button', { name: 'Inspect scope' });
      const apply = within(dialog).getByRole('button', { name: 'Request apply' });
      expect(inspect.closest('[data-slot="modal-header"]')?.parentElement).toBe(dialog);
      expect(apply.closest('[data-slot="modal-footer"]')?.parentElement).toBe(dialog);
      expect(body).not.toContainElement(inspect);
      expect(body).not.toContainElement(apply);
      await user.click(inspect);
      await user.click(apply);
      expect(onInspect).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(dialog).toBeInTheDocument();
    },
  );

  it('requests a close but waits for its controlled host to change open', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const props = {
      onOpenChange,
      title: 'Controlled dialog',
      description: 'The host owns the open state.',
      trigger: <Button>Open controlled dialog</Button>,
      children: <p>Dialog content</p>,
    };
    const { rerender } = render(<Modal {...props} open />);
    await user.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('dialog', { name: 'Controlled dialog' })).toBeInTheDocument();
    rerender(<Modal {...props} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets a footer submit a body form without moving its actions into the scroller', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Edit project"
          description="Update this local draft."
          trigger={<Button>Edit project</Button>}
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" form="project-form">
                Save project
              </Button>
            </>
          }
        >
          <form
            id="project-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSave(new FormData(event.currentTarget).get('name'));
              setOpen(false);
            }}
          >
            <label>
              Project name
              <input name="name" defaultValue="Relay" />
            </label>
          </form>
        </Modal>
      );
    }
    render(<Demo />);
    const trigger = screen.getByRole('button', { name: 'Edit project' });
    await user.click(trigger);
    const name = screen.getByRole('textbox', { name: 'Project name' });
    await user.clear(name);
    await user.type(name, 'Search workspace');
    await user.click(screen.getByRole('button', { name: 'Save project' }));
    expect(onSave).toHaveBeenCalledWith('Search workspace');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
