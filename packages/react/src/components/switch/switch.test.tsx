import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './switch.js';

describe('Checkbox and Switch', () => {
  it('does not mutate controlled selection and supports host acknowledgement', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <Switch aria-label="Availability" checked={false} onCheckedChange={change} />,
    );
    const toggle = screen.getByRole('switch');
    await userEvent.click(toggle);
    expect(change).toHaveBeenCalledWith(true);
    expect(toggle).not.toBeChecked();
    rerender(<Switch aria-label="Availability" checked onCheckedChange={change} />);
    expect(toggle).toBeChecked();
  });

  it('labels itself with label and description', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <Switch
        label="Web search"
        description="Cite sources"
        onCheckedChange={change}
        disabled={false}
      />,
    );
    const toggle = screen.getByRole('switch', { name: 'Web search' });
    expect(toggle).toHaveAccessibleDescription('Cite sources');
    await user.click(screen.getByText('Web search'));
    expect(change).toHaveBeenCalledWith(true);
  });

  it('passes disabled to its own field', () => {
    render(<Switch label="Locked" disabled />);
    expect(screen.getByRole('switch', { name: 'Locked' })).toBeDisabled();
  });
});
