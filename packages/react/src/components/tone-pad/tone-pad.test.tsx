import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TonePad } from './tone-pad.js';
import { Field } from '../field/field.js';

const axes = { x: ['Formal', 'Casual'] as const, y: ['Detailed', 'Brief'] as const };

describe('TonePad', () => {
  it('exposes one named slider per axis and reports both values', () => {
    const onValueChange = vi.fn();
    render(
      <TonePad label="Tone" value={{ x: 0.3, y: 0.7 }} onValueChange={onValueChange} axes={axes} />,
    );
    expect(screen.getByRole('group', { name: 'Tone' })).toBeVisible();
    const x = screen.getByRole('slider', { name: 'Formal to Casual' });
    const y = screen.getByRole('slider', { name: 'Detailed to Brief' });
    expect(x).toHaveValue('30');
    expect(y).toHaveValue('70');
    expect(x).toHaveAttribute('aria-valuetext', '30% toward Casual');
    // jsdom does not step a range input on arrow keys; the browser does, and fires change.
    fireEvent.change(x, { target: { value: '40' } });
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 0.4, y: 0.7 });
    fireEvent.change(y, { target: { value: '0' } });
    expect(onValueChange).toHaveBeenLastCalledWith({ x: 0.3, y: 0 });
  });
  it('takes its name and disabled state from Field and clamps bad values', () => {
    render(
      <Field label="Tone" labelAs="span" disabled>
        <TonePad value={{ x: 4, y: Number.NaN }} onValueChange={() => {}} axes={axes} />
      </Field>,
    );
    expect(screen.getByRole('group', { name: 'Tone' })).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByRole('slider', { name: 'Formal to Casual' })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Formal to Casual' })).toHaveValue('100');
    expect(screen.getByRole('slider', { name: 'Detailed to Brief' })).toHaveValue('0');
  });
});
