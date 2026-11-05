import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutHelp, useShortcutHelp } from './shortcut-help.js';

const shortcuts = [
  { id: 'send', label: 'Send', keys: ['Enter'] },
  { id: 'line', label: 'New line', keys: ['Shift', 'Enter'], group: 'Composer' },
  { id: 'find', label: 'Search', keys: ['Ctrl', 'K'], group: 'Navigation' },
];

function Harness() {
  const [open, setOpen] = useState(false);
  useShortcutHelp(() => setOpen(true), !open);
  return (
    <>
      <textarea aria-label="Draft" />
      <ShortcutHelp open={open} onOpenChange={setOpen} shortcuts={shortcuts} />
    </>
  );
}

describe('ShortcutHelp', () => {
  it('lists each key as its own cap, under the group it was given', () => {
    render(<ShortcutHelp open onOpenChange={() => {}} shortcuts={shortcuts} />);
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    expect(screen.getByText('Composer')).toBeVisible();
    expect(screen.getByText('Navigation')).toBeVisible();
    expect(screen.getByText('Send').closest('li')).toHaveTextContent('Enter');
    expect(screen.getAllByText('+').length).toBeGreaterThan(0);
    expect(screen.getByText('K').tagName).toBe('KBD');
  });

  it('says when the host supplied no shortcuts', () => {
    render(<ShortcutHelp open onOpenChange={() => {}} shortcuts={[]} />);
    expect(screen.getByText('No shortcuts were supplied.')).toBeVisible();
  });

  it('closes from the sheet and returns the decision to the host', async () => {
    const onOpenChange = vi.fn();
    render(<ShortcutHelp open onOpenChange={onOpenChange} shortcuts={shortcuts} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Close panel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('opens on ? outside a text field, and leaves ? alone inside one', () => {
    render(<Harness />);
    const draft = screen.getByRole('textbox', { name: 'Draft' });
    draft.focus();
    fireEvent.keyDown(draft, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  });
});
