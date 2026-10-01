import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './field.js';
import { Input } from '../input/input.js';
import { Textarea } from '../textarea/textarea.js';

describe('Field and text controls', () => {
  it('associates label, description, required state and error without removing host descriptions', async () => {
    render(
      <>
        <p id="policy">Company policy applies.</p>
        <Field
          id="email"
          label="Email"
          required
          description="Use your work address."
          error="Enter a valid address."
        >
          <Input type="email" aria-describedby="policy email-description" />
        </Field>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'policy email-description email-error');
    expect(input).toHaveAccessibleDescription(
      'Company policy applies. Use your work address. Enter a valid address.',
    );
    await userEvent.click(screen.getByText('Email'));
    expect(input).toHaveFocus();
  });

  it('updates error associations without replacing the focused input or inventing validation', () => {
    const { rerender } = render(
      <Field label="Name" error="Required">
        <Input defaultValue="Original" />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    input.focus();
    rerender(
      <Field label="Name" description="Your display name">
        <Input defaultValue="Original" />
      </Field>,
    );
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input).toHaveFocus();
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('Your display name');
    expect(input).toHaveValue('Original');
  });

  it('generates unique IDs, forwards refs/native attributes and restores uncontrolled values on reset', async () => {
    const inputRef = createRef<HTMLInputElement>();
    const areaRef = createRef<HTMLTextAreaElement>();
    render(
      <form aria-label="Profile">
        <Field label="Name">
          <Input ref={inputRef} defaultValue="Ada" name="name" autoComplete="name" />
        </Field>
        <Field label="Biography">
          <Textarea ref={areaRef} defaultValue="Engineer" name="bio" rows={5} maxLength={30} />
        </Field>
        <button type="reset">Reset</button>
      </form>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    const area = screen.getByRole('textbox', { name: 'Biography' });
    expect(input.id).not.toBe(area.id);
    expect(inputRef.current).toBe(input);
    expect(areaRef.current).toBe(area);
    expect(area).toHaveAttribute('rows', '5');
    expect(input).toHaveAttribute('autocomplete', 'name');
    await userEvent.type(input, ' Lovelace');
    await userEvent.type(area, ' and writer');
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('name')).toBe(
      'Ada Lovelace',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input).toHaveValue('Ada');
    expect(area).toHaveValue('Engineer');
  });

  it('keeps controlled value and readOnly/disabled behavior under host control', async () => {
    const change = vi.fn();
    const { rerender } = render(
      <Field label="Name">
        <Input value="Host" onChange={change} />
      </Field>,
    );
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '!');
    expect(change).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('Host');
    rerender(
      <Field label="Name" disabled>
        <Input value="Updated" onChange={change} disabled={false} />
      </Field>,
    );
    expect(input).toBeDisabled();
    expect(input).toHaveValue('Updated');
    rerender(
      <Field label="Name">
        <Input value="Read only" readOnly />
      </Field>,
    );
    await userEvent.type(input, '!');
    expect(input).toHaveValue('Read only');
  });

  it('renders untrusted validation text as text and keeps distinct fields isolated', () => {
    render(
      <>
        <Field label="First" error={'<script>run()</script>'}>
          <Input />
        </Field>
        <Field label="Second">
          <Textarea />
        </Field>
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'First' })).toHaveAccessibleDescription(
      '<script>run()</script>',
    );
    expect(screen.getByRole('textbox', { name: 'Second' })).not.toHaveAttribute('aria-describedby');
    expect(document.querySelector('script')).toBeNull();
  });
});
