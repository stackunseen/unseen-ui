import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { IconButton, IconsProvider, ContextBar, Modal, Button, AITheme } from '@stackunseen/ui';

describe('compact contextual actions', () => {
  it('keeps context removal host-controlled when its decorative icon is hidden', async () => {
    const remove = vi.fn();
    const { rerender } = render(
      <IconsProvider icons={{ close: null }}>
        <ContextBar
          items={[{ id: 'context', label: 'Workspace reference', state: 'included' }]}
          onRemove={remove}
        />
      </IconsProvider>,
    );
    const action = screen.getByRole('button', { name: 'Remove Workspace reference' });
    action.focus();
    await userEvent.keyboard('{Enter}');
    expect(remove).toHaveBeenCalledWith('context');
    expect(screen.getByText('Workspace reference')).toBeVisible();
    expect(action).toHaveTextContent('Remove Workspace reference');
    rerender(
      <IconsProvider icons={{ close: null }}>
        <ContextBar items={[]} onRemove={remove} />
      </IconsProvider>,
    );
    expect(screen.getByRole('group', { name: 'Request context' })).toHaveFocus();
  });

  it('closes a dialog through the shared action with a null glyph and restores trigger focus', async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <IconsProvider icons={{ close: null }}>
          <AITheme>
            <Modal
              open={open}
              onOpenChange={setOpen}
              title="Review evidence"
              description="Source details"
              trigger={<Button>Inspect</Button>}
            >
              <p>Source content</p>
            </Modal>
          </AITheme>
        </IconsProvider>
      );
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Inspect' });
    await userEvent.click(trigger);
    const close = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close panel' });
    expect(close).toHaveTextContent('Close panel');
    close.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('preserves icon action names and provider overrides, including null overrides', () => {
    const { container, rerender } = render(
      <IconsProvider icons={{ delete: (props) => <svg {...props} data-brand="delete" /> }}>
        <IconButton icon="delete" label="Remove draft" />
      </IconsProvider>,
    );
    expect(screen.getByRole('button', { name: 'Remove draft' })).toHaveAccessibleName(
      'Remove draft',
    );
    expect(container.querySelector('[data-brand="delete"]')).toBeInTheDocument();
    rerender(
      <IconsProvider icons={{ delete: null }}>
        <IconButton icon="delete" label="Remove draft" />
      </IconsProvider>,
    );
    expect(screen.getByRole('button', { name: 'Remove draft' })).toBeInTheDocument();
    expect(container.querySelector('[data-ai-icon]')).toBeNull();
    expect(screen.getByText('Remove draft')).toBeInTheDocument();
  });
});
