import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../field/field.js';
import { RadioGroup } from './radio-group.js';

const options = [
  { value: 'a', label: 'Email', description: 'A daily digest' },
  { value: 'b', label: 'SMS', disabled: true },
  { value: 'c', label: 'In app' },
];

describe('RadioGroup', () => {
  it('names the group and describes each option with its own and field guidance', () => {
    render(
      <Field
        labelAs="span"
        label="Delivery"
        description="Choose one method"
        required
        error="Choose an available method"
      >
        <RadioGroup options={options} />
      </Field>,
    );
    const group = screen.getByRole('group', { name: 'Delivery' });
    expect(document.querySelector(`label[for="${group.id}"]`)).toBeNull();
    const input = within(group).getByRole('radio', { name: 'Email' });
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription(
      'Choose one method Choose an available method A daily digest',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: 'SMS' })).toBeDisabled();
  });

  it('keeps selection local to each native group and resets uncontrolled form values', async () => {
    render(
      <form aria-label="Options">
        <RadioGroup aria-label="Primary" options={options} defaultValue="a" name="delivery" />
        <RadioGroup aria-label="Secondary" options={options} defaultValue="c" />
        <button type="reset">Reset</button>
      </form>,
    );
    const first = within(screen.getByRole('group', { name: 'Primary' }));
    const second = within(screen.getByRole('group', { name: 'Secondary' }));
    await userEvent.click(first.getByRole('radio', { name: 'In app' }));
    expect(first.getByRole('radio', { name: 'In app' })).toBeChecked();
    expect(second.getByRole('radio', { name: 'In app' })).toBeChecked();
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('delivery')).toBe('c');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(first.getByRole('radio', { name: 'Email' })).toBeChecked();
  });

  it('uses native radio arrow-key movement, skipping disabled choices', async () => {
    const change = vi.fn();
    render(
      <RadioGroup
        aria-label="Delivery"
        options={options}
        defaultValue="a"
        onValueChange={change}
      />,
    );
    screen.getByRole('radio', { name: 'Email' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'In app' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'In app' })).toBeChecked();
    expect(change).toHaveBeenCalledWith('c');
  });

  it('does not fabricate a selection for unavailable host values, empty options or disabled groups', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <RadioGroup
        aria-label="Delivery"
        options={options}
        value="missing"
        onValueChange={change}
        disabled
      />,
    );
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked();
      expect(radio).toBeDisabled();
    }
    await userEvent.click(screen.getByRole('radio', { name: 'In app' }));
    expect(change).not.toHaveBeenCalled();
    rerender(<RadioGroup aria-label="Delivery" options={[]} />);
    expect(screen.getByRole('group', { name: 'Delivery' })).toHaveTextContent(
      'No options available.',
    );
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('retains the host-controlled value until acknowledged', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <RadioGroup aria-label="Delivery" options={options} value="a" onValueChange={change} />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'In app' }));
    expect(change).toHaveBeenCalledWith('c');
    expect(screen.getByRole('radio', { name: 'Email' })).toBeChecked();
    rerender(
      <RadioGroup aria-label="Delivery" options={options} value="c" onValueChange={change} />,
    );
    expect(screen.getByRole('radio', { name: 'In app' })).toBeChecked();
  });

  it('names the group with a legend from label', () => {
    render(<RadioGroup label="Repeat" options={options} value="a" onValueChange={() => {}} />);
    const group = screen.getByRole('group', { name: 'Repeat' });
    expect(within(group).getByRole('radio', { name: 'Email' })).toBeChecked();
  });
});
