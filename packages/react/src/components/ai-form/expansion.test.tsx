import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AIForm } from '@stackunseen/ui';
import { formFields } from '../../../../../apps/docs/lib/coding-fixtures';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('validates required fields and omits inactive conditional values from submission', async () => {
    const submit = vi.fn();
    const { rerender } = render(
      <AIForm
        fields={formFields}
        values={{ environment: 'preview' }}
        onValueChange={() => {}}
        onSubmit={submit}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('highlighted');
    rerender(
      <AIForm
        fields={formFields}
        values={{ name: 'Demo', environment: 'preview', replicas: '99' }}
        onValueChange={() => {}}
        onSubmit={submit}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).toHaveBeenCalledWith({ name: 'Demo', environment: 'preview', notes: '' });
  });

  it('controlled forms do not submit on a disabled pending action', () => {
    const submit = vi.fn();
    render(
      <AIForm
        fields={formFields}
        values={{ name: 'A', environment: 'preview' }}
        onValueChange={() => {}}
        onSubmit={submit}
        status="pending"
      />,
    );
    fireEvent.submit(screen.getByRole('button', { name: 'Submitting…' }).closest('form')!);
    expect(submit).not.toHaveBeenCalled();
  });
});
