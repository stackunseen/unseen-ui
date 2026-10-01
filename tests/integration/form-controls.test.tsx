import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../../packages/react/src/components/checkbox/checkbox.js';
import { Field } from '../../packages/react/src/components/field/field.js';
import { Switch } from '../../packages/react/src/components/switch/switch.js';

describe('Checkbox and Switch', () => {
  it('supports keyboard toggle, native submission and reset for both controls', async () => {
    const checked = vi.fn();
    render(
      <form aria-label="Preferences">
        <Field label="Terms" required>
          <Checkbox name="terms" value="accepted" onCheckedChange={checked} />
        </Field>
        <Field label="Notifications">
          <Switch name="notifications" defaultChecked />
        </Field>
        <button type="reset">Reset</button>
      </form>,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Terms' });
    const toggle = screen.getByRole('switch', { name: 'Notifications' });
    checkbox.focus();
    await userEvent.keyboard(' ');
    expect(checkbox).toBeChecked();
    expect(checked).toHaveBeenCalledWith(true);
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(toggle).not.toBeChecked();
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('terms')).toBe('accepted');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(checkbox).not.toBeChecked();
    expect(toggle).toBeChecked();
  });
});
