import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox.js';
import { Field } from '../field/field.js';

describe('Checkbox and Switch', () => {
  it('exposes indeterminate state and forwards the actual input ref', () => {
    const ref = createRef<HTMLInputElement>();
    const { rerender } = render(<Checkbox ref={ref} aria-label="All items" indeterminate />);
    const input = screen.getByRole('checkbox');
    expect(ref.current).toBe(input);
    expect(input).toBePartiallyChecked();
    rerender(<Checkbox ref={ref} aria-label="All items" indeterminate={false} />);
    expect(input).not.toBePartiallyChecked();
  });

  it('keeps mixed selection until the host acknowledges a new state', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <Checkbox aria-label="All items" indeterminate onCheckedChange={change} />,
    );
    const input = screen.getByRole('checkbox');
    await userEvent.click(input);
    expect(change).toHaveBeenCalledWith(true);
    expect(input).toBePartiallyChecked();
    rerender(<Checkbox aria-label="All items" indeterminate={false} onCheckedChange={change} />);
    expect(input).not.toBePartiallyChecked();
  });

  it('disables interaction through Field and preserves native event cancellation', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <Field label="Enable" disabled>
        <Checkbox onCheckedChange={change} />
      </Field>,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    expect(change).not.toHaveBeenCalled();
    rerender(
      <Field label="Enable">
        <Checkbox onChange={(event) => event.preventDefault()} onCheckedChange={change} />
      </Field>,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    expect(change).not.toHaveBeenCalled();
  });

  it('labels itself with label and description, keeping the id and ref', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLInputElement>();
    const change = vi.fn();
    render(
      <Checkbox
        ref={ref}
        id="terms"
        label="Accept the terms"
        description="You can change this later."
        onCheckedChange={change}
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Accept the terms' });
    expect(box).toHaveAttribute('id', 'terms');
    expect(box).toHaveAccessibleDescription('You can change this later.');
    expect(ref.current).toBe(box);
    await user.click(screen.getByText('Accept the terms'));
    expect(change).toHaveBeenCalledWith(true);
  });

  it('stays a bare control without a label', () => {
    const { container } = render(<Checkbox aria-label="Row" />);
    expect(container.firstElementChild?.tagName).toBe('INPUT');
  });
});
