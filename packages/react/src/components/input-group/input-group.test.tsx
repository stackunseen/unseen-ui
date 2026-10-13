import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputGroup, InputGroupAddon, InputGroupButton } from './input-group.js';
import { Field } from '../field/field.js';
import { Input } from '../input/input.js';

afterEach(cleanup);

describe('InputGroup', () => {
  it('holds a labelled input and a submit button that work in a native form', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Field label="Email address" description="One email per release.">
          <InputGroup shape="pill" size="touch">
            <InputGroupAddon>@</InputGroupAddon>
            <Input type="email" name="email" placeholder="you@company.com" />
            <InputGroupButton type="submit">Subscribe</InputGroupButton>
          </InputGroup>
        </Field>
      </form>,
    );
    const input = screen.getByRole('textbox', { name: 'Email address' });
    expect(input).toHaveAccessibleDescription('One email per release.');
    const group = input.closest('[data-part="input-group"]');
    expect(group).toHaveAttribute('data-shape', 'pill');
    expect(group).toHaveAttribute('data-size', 'touch');
    expect(group).toHaveAttribute('data-attach', 'flush');
    await user.type(input, 'me@example.test{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('takes invalid and disabled from Field and from its own props', () => {
    const { rerender } = render(
      <Field label="Code" error="Enter the six digits.">
        <InputGroup attach="inset">
          <Input />
          <InputGroupButton variant="outline">Verify</InputGroupButton>
        </InputGroup>
      </Field>,
    );
    const group = screen.getByRole('textbox').closest('[data-part="input-group"]');
    expect(group).toHaveAttribute('data-invalid', 'true');
    expect(group).toHaveAttribute('data-attach', 'inset');
    rerender(
      <InputGroup disabled invalid>
        <Input disabled />
        <InputGroupButton disabled>Go</InputGroupButton>
      </InputGroup>,
    );
    const plain = screen.getByRole('textbox').closest('[data-part="input-group"]');
    expect(plain).toHaveAttribute('data-disabled', 'true');
    expect(plain).toHaveAttribute('data-invalid', 'true');
  });

  it('renders on the server', () => {
    const html = renderToString(
      <InputGroup>
        <Input defaultValue="npx create" readOnly />
        <InputGroupButton>Copy</InputGroupButton>
      </InputGroup>,
    );
    expect(html).toContain('data-part="input-group"');
    expect(html).toContain('npx create');
  });
});
