import { useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Accordion } from './accordion.js';

function Draft({ onMount }: { onMount?: () => void }) {
  const [value, setValue] = useState('');
  useEffect(() => onMount?.(), [onMount]);
  return (
    <input aria-label="Unsent draft" value={value} onChange={(e) => setValue(e.target.value)} />
  );
}

describe('Accordion mounted content', () => {
  it.each(['divided', 'bordered', 'separated'] as const)(
    '%s preserves local drafts while hiding closed controls from keyboard and accessibility queries',
    async (variant) => {
      const user = userEvent.setup();
      const mount = vi.fn();
      render(
        <>
          <Accordion
            type="single"
            collapsible
            variant={variant}
            items={[
              {
                value: 'settings',
                title: 'Settings',
                keepMounted: true,
                content: <Draft onMount={mount} />,
              },
            ]}
          />
          <button>After settings</button>
        </>,
      );
      const trigger = screen.getByRole('button', { name: 'Settings' });
      const panel = screen.getByLabelText('Unsent draft').closest('[role="region"]');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(panel).toHaveAttribute('hidden');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(mount).toHaveBeenCalledOnce();
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After settings' })).toHaveFocus();
      trigger.focus();
      await user.keyboard('{Enter}');
      expect(panel).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(panel).toHaveAccessibleName('Settings');
      expect(panel).not.toHaveAttribute('hidden');
      const draft = screen.getByRole('textbox', { name: 'Unsent draft' });
      await user.type(draft, 'Keep this text');
      await user.click(trigger);
      expect(trigger).toHaveFocus();
      expect(panel).toHaveAttribute('hidden');
      expect(draft).not.toBeVisible();
      await user.keyboard(' ');
      expect(screen.getByRole('textbox', { name: 'Unsent draft' })).toBe(draft);
      expect(draft).toHaveValue('Keep this text');
      expect(mount).toHaveBeenCalledOnce();
    },
  );

  it('retains default unmounting and initially open panels', async () => {
    const user = userEvent.setup();
    render(
      <Accordion
        type="single"
        collapsible
        defaultValue="draft"
        items={[{ value: 'draft', title: 'Draft', content: <Draft /> }]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Draft' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.type(screen.getByRole('textbox'), 'Temporary');
    await user.click(trigger);
    expect(screen.queryByLabelText('Unsent draft')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('preserves controlled multiple state, disabled items, heading level and group semantics', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const items = [
      { value: 'one', title: 'First', keepMounted: true, content: <Draft /> },
      { value: 'two', title: 'Second', keepMounted: true, content: <button>Nested action</button> },
      { value: 'locked', title: 'Locked', disabled: true, content: 'Unavailable' },
    ];
    const view = (value: string[]) => (
      <Accordion
        type="multiple"
        value={value}
        onValueChange={onValueChange}
        items={items}
        headingLevel={4}
        region={false}
      />
    );
    const { rerender } = render(view(['one']));
    expect(screen.getByRole('heading', { name: 'First', level: 4 })).toBeVisible();
    expect(screen.getByRole('group', { name: 'First' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Locked' })).toBeDisabled();
    const second = screen.getByRole('button', { name: 'Second' });
    await user.click(second);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(['one', 'two']);
    expect(second).toHaveAttribute('aria-expanded', 'false');
    rerender(view(['one', 'two']));
    expect(screen.getByRole('button', { name: 'Nested action' })).toBeVisible();
    expect(second.querySelector('button')).toBeNull();
    second.focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(second).toHaveFocus();
  });
});
