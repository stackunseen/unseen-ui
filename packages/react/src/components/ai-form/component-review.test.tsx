import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AIForm } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it.each([
    { type: 'checkbox' as const, value: 'false' },
    { type: 'number' as const, value: true },
    { type: 'text' as const, value: true },
    { type: 'select' as const, value: true },
  ])('does not submit a $type field with a value of the wrong type', async ({ type, value }) => {
    const submit = vi.fn();
    render(
      <AIForm
        fields={[
          {
            id: 'answer',
            label: 'Answer',
            type,
            required: true,
            options: [{ value: 'yes', label: 'Yes' }],
          },
        ]}
        values={{ answer: value }}
        onValueChange={() => {}}
        onSubmit={submit}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Review the highlighted fields');
    expect(screen.getByLabelText('Answer *')).toHaveAttribute('aria-invalid', 'true');
  });

  it('exposes required semantics and focuses the first invalid field', async () => {
    render(
      <AIForm
        fields={[
          { id: 'name', label: 'Name', type: 'text', required: true },
          {
            id: 'environment',
            label: 'Environment',
            type: 'select',
            required: true,
            options: [{ value: 'preview', label: 'Preview' }],
          },
          { id: 'confirm', label: 'Confirm', type: 'checkbox', required: true },
        ]}
        values={{}}
        onValueChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Name *' })).toBeRequired();
    expect(screen.getByRole('combobox', { name: 'Environment *' })).toHaveAttribute(
      'aria-required',
      'true',
    );
    expect(screen.getByRole('checkbox', { name: 'Confirm *' })).toBeRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('textbox', { name: 'Name *' })).toHaveFocus();
  });
});
