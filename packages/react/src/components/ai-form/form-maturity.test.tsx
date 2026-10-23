import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AIForm } from '@stackunseen/ui';
import type {
  AIArrayChange,
  AIArrayValues,
  AIField,
  AIFieldArray,
  AIFormProps,
  AIFormStep,
  FormValues,
} from '@stackunseen/ui';

const identity = { formId: 'deployment', schemaVersion: '2', draftVersion: 'draft-4' };
const fields: AIField[] = [{ id: 'project', label: 'Project', type: 'text', required: true }];
const arrays: AIFieldArray[] = [
  {
    id: 'reviewers',
    label: 'Reviewers',
    minItems: 1,
    maxItems: 3,
    reorderable: true,
    fields: [
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'notify', label: 'Notify', type: 'checkbox' },
    ],
  },
];
const steps: AIFormStep[] = [
  { id: 'basics', title: 'Basics', fieldIds: ['project'] },
  { id: 'review', title: 'Review team', fieldIds: ['reviewers'] },
];
const defaults = {
  fields,
  values: { project: 'Example' },
  onValueChange: () => {},
  onSubmit: () => {},
};
function Host({
  variant = 'stacked',
  submit = () => {},
}: {
  variant?: AIFormProps['variant'];
  submit?: AIFormProps['onSubmit'];
}) {
  const [values, setValues] = useState<FormValues>({ project: '' });
  const [rows, setRows] = useState<AIArrayValues>({
    reviewers: [{ id: 'r1', values: { name: 'Ada' } }],
  });
  const [step, setStep] = useState('basics');
  function change(request: AIArrayChange) {
    const current = rows[request.arrayId] ?? [];
    let next = current;
    if (request.type === 'add') next = [...current, { id: `r${current.length + 1}`, values: {} }];
    if (request.type === 'remove') next = current.filter((row) => row.id !== request.rowId);
    if (request.type === 'change')
      next = current.map((row) =>
        row.id === request.rowId
          ? { ...row, values: { ...row.values, [request.fieldId]: request.value } }
          : row,
      );
    if (request.type === 'move') {
      const row = current.find((row) => row.id === request.rowId)!;
      const remaining = current.filter((row) => row.id !== request.rowId);
      next = [...remaining.slice(0, request.toIndex), row, ...remaining.slice(request.toIndex)];
    }
    setRows({ ...rows, [request.arrayId]: next });
  }
  return (
    <AIForm
      {...defaults}
      variant={variant}
      values={values}
      onValueChange={setValues}
      arrays={arrays}
      arrayValues={rows}
      onArrayChange={change}
      steps={steps}
      step={step}
      onStepChange={setStep}
      identity={identity}
      onSubmit={submit}
    />
  );
}
describe('controlled repeatable and multistep forms', () => {
  it.each(['stacked', 'grid', 'compact'] as const)(
    '%s validates navigation, edits repeated rows, restores drafts and submits all steps',
    async (variant) => {
      const submit = vi.fn();
      render(<Host variant={variant} submit={submit} />);
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('textbox', { name: 'Project *' })).toHaveFocus();
      expect(screen.queryByRole('group', { name: 'Reviewers' })).toBeNull();
      await userEvent.type(screen.getByRole('textbox', { name: 'Project *' }), 'Agent UI');
      expect(screen.queryByRole('alert')).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText('Review team', { selector: 'strong' })).toHaveFocus();
      await userEvent.click(screen.getByRole('button', { name: 'Add Reviewers' }));
      const second = screen.getByRole('group', { name: 'Reviewers item 2' });
      expect(within(second).getByRole('textbox')).toHaveFocus();
      await userEvent.type(within(second).getByRole('textbox'), 'Grace');
      await userEvent.click(screen.getByRole('button', { name: 'Move Reviewers item 2 up' }));
      expect(
        within(screen.getByRole('group', { name: 'Reviewers item 1' })).getByRole('textbox'),
      ).toHaveValue('Grace');
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByRole('textbox', { name: 'Project *' })).toHaveValue('Agent UI');
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(submit).toHaveBeenCalledExactlyOnceWith(
        { project: 'Agent UI' },
        {
          identity,
          arrayValues: {
            reviewers: [
              { id: 'r2', values: { name: 'Grace', notify: false } },
              { id: 'r1', values: { name: 'Ada', notify: false } },
            ],
          },
        },
      );
    },
  );
  it('emits versioned intents and waits for host props without inventing row IDs or values', async () => {
    const change = vi.fn();
    const rowValues = { reviewers: [{ id: 'r1', values: { name: 'Ada' } }] };
    render(
      <AIForm
        {...defaults}
        arrays={arrays}
        arrayValues={rowValues}
        onArrayChange={change}
        identity={identity}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add Reviewers' }));
    expect(change).toHaveBeenCalledWith({ type: 'add', arrayId: 'reviewers', identity });
    expect(screen.queryByRole('group', { name: 'Reviewers item 2' })).toBeNull();
    await userEvent.type(screen.getByRole('textbox', { name: 'Name *' }), 'X');
    expect(change).toHaveBeenLastCalledWith({
      type: 'change',
      arrayId: 'reviewers',
      rowId: 'r1',
      fieldId: 'name',
      value: 'AdaX',
      identity,
    });
    expect(screen.getByRole('textbox', { name: 'Name *' })).toHaveValue('Ada');
    expect(screen.getByRole('button', { name: 'Remove Reviewers item 1' })).toBeDisabled();
  });
  it('retains row error identity and focus through host reordering and acknowledged removal', async () => {
    const rows = [
      { id: 'a', values: { name: '' } },
      { id: 'b', values: { name: 'Grace' } },
    ];
    const props = {
      ...defaults,
      arrays,
      identity,
      onArrayChange: vi.fn(),
      arrayValues: { reviewers: rows },
    };
    const { rerender } = render(<AIForm {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const invalid = screen.getAllByRole('textbox', { name: 'Name *' })[0]!;
    expect(invalid).toHaveFocus();
    rerender(<AIForm {...props} arrayValues={{ reviewers: [rows[1]!, rows[0]!] }} />);
    expect(screen.getAllByRole('textbox', { name: 'Name *' })[1]).toBe(invalid);
    expect(invalid).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Reviewers item 2' }));
    rerender(<AIForm {...props} arrayValues={{ reviewers: [rows[1]!] }} />);
    expect(screen.getByRole('textbox', { name: 'Name *' })).toHaveFocus();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('checks earlier steps on final submission and focuses only after the host changes step', async () => {
    const submit = vi.fn(),
      navigate = vi.fn();
    const props = {
      ...defaults,
      values: { project: '' },
      arrays,
      arrayValues: { reviewers: [{ id: 'r', values: { name: 'Ada' } }] },
      steps,
      step: 'review',
      identity,
      onStepChange: navigate,
      onSubmit: submit,
    };
    const { rerender } = render(<AIForm {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(submit).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('basics');
    expect(screen.queryByRole('textbox', { name: 'Project *' })).toBeNull();
    rerender(<AIForm {...props} step="basics" />);
    expect(screen.getByRole('textbox', { name: 'Project *' })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Project *' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
  it('rejects jumping across an invalid unseen step', async () => {
    const navigate = vi.fn();
    render(
      <AIForm
        {...defaults}
        values={{}}
        identity={identity}
        steps={[
          { id: 'a', title: 'First', fieldIds: ['project'] },
          { id: 'b', title: 'Middle', fieldIds: [] },
          { id: 'c', title: 'Last', fieldIds: [] },
        ]}
        step="a"
        onStepChange={navigate}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '3. Last' }));
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
  it('omits inactive top-level, array and dependent row values from submission', async () => {
    const submit = vi.fn();
    render(
      <AIForm
        fields={[
          { id: 'include', label: 'Include', type: 'checkbox' },
          { id: 'detail', label: 'Detail', type: 'text', when: { field: 'include', equals: true } },
          { id: 'nested', label: 'Nested', type: 'text', when: { field: 'detail', equals: 'yes' } },
        ]}
        values={{ include: false, detail: 'yes', nested: 'secret' }}
        onValueChange={() => {}}
        onSubmit={submit}
        identity={identity}
        arrays={[
          { id: 'hidden', label: 'Hidden', fields, when: { field: 'include', equals: true } },
          {
            id: 'visible',
            label: 'Visible',
            fields: [
              { id: 'enabled', label: 'Enabled', type: 'checkbox' },
              {
                id: 'private',
                label: 'Private',
                type: 'text',
                when: { field: 'enabled', equals: true },
              },
            ],
          },
        ]}
        arrayValues={{
          hidden: [{ id: 'h', values: { project: 'secret' } }],
          visible: [{ id: 'v', values: { enabled: false, private: 'secret' } }],
        }}
      />,
    );
    expect(screen.queryByDisplayValue('secret')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).toHaveBeenCalledWith(
      { include: false },
      { identity, arrayValues: { visible: [{ id: 'v', values: { enabled: false } }] } },
    );
  });
  it('exposes minimum/maximum count errors and enforces structural action limits', async () => {
    const submit = vi.fn(),
      change = vi.fn();
    const props = { ...defaults, arrays, identity, onSubmit: submit, onArrayChange: change };
    const { rerender } = render(<AIForm {...props} arrayValues={{ reviewers: [] }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('group', { name: 'Reviewers' })).toHaveFocus();
    expect(screen.getByText('Use 1 to 3 items.')).toBeVisible();
    rerender(
      <AIForm
        {...props}
        arrayValues={{
          reviewers: Array.from({ length: 4 }, (_, i) => ({
            id: String(i),
            values: { name: 'Ada' },
          })),
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add Reviewers' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).not.toHaveBeenCalled();
  });
  it('disables array changes and nonfinal navigation when handlers are absent', () => {
    render(
      <AIForm
        {...defaults}
        arrays={arrays}
        arrayValues={{ reviewers: [{ id: 'r', values: { name: 'Ada' } }] }}
        identity={identity}
        steps={steps}
        step="review"
      />,
    );
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Reviewers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });
  it.each(['loading', 'denied', 'stale', 'unavailable'] as const)(
    '%s hides host data and prevents all intents',
    async (status) => {
      const action = vi.fn();
      render(
        <AIForm
          {...defaults}
          status={status}
          values={{ project: 'private-source' }}
          arrays={arrays}
          arrayValues={{ reviewers: [{ id: 'r', values: { name: 'private-source' } }] }}
          identity={identity}
          onValueChange={action}
          onArrayChange={action}
          onSubmit={action}
        />,
      );
      expect(screen.queryByDisplayValue('private-source')).toBeNull();
      expect(screen.queryByRole('group', { name: 'Reviewers' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
      expect(action).not.toHaveBeenCalled();
    },
  );
  it.each(['pending', 'complete'] as const)(
    '%s retains visible fields but locks mutation and submission',
    (status) => {
      render(
        <AIForm
          {...defaults}
          identity={identity}
          status={status}
          arrays={arrays}
          arrayValues={{ reviewers: [{ id: 'r', values: { name: 'Ada' } }] }}
          onArrayChange={() => {}}
        />,
      );
      expect(screen.getByRole('textbox', { name: 'Project *' })).toHaveValue('Example');
      expect(screen.getAllByRole('textbox').every((input) => input.hasAttribute('disabled'))).toBe(
        true,
      );
      expect(screen.getByRole('button', { name: 'Add Reviewers' })).toBeDisabled();
    },
  );
  it('hides obsolete receipts and validation when the host replaces form identity', async () => {
    const props = { ...defaults, values: {}, identity };
    const { rerender } = render(<AIForm {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toBeVisible();
    const next = { ...identity, schemaVersion: '3' };
    rerender(<AIForm {...props} identity={next} />);
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(
      <AIForm
        {...props}
        identity={next}
        status="complete"
        receipt={{ identity, message: 'Old secret receipt' }}
      />,
    );
    expect(screen.queryByText('Old secret receipt')).toBeNull();
    expect(screen.getByRole('button', { name: 'Receipt unavailable' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('doesn’t match');
    rerender(
      <AIForm
        {...props}
        identity={next}
        status="complete"
        receipt={{ identity: next, message: 'Current receipt' }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Current receipt');
  });
  it('clears obsolete validation after controlled value correction', async () => {
    const props = { ...defaults, values: {} };
    const { rerender } = render(<AIForm {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    rerender(<AIForm {...props} values={{ project: 'Ready' }} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });
  it('keeps scalar callback compatibility and legacy host receipts', async () => {
    const submit = vi.fn();
    const { rerender } = render(<AIForm {...defaults} onSubmit={submit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).toHaveBeenCalledExactlyOnceWith({ project: 'Example' });
    rerender(<AIForm {...defaults} status="complete" receipt="Saved by host" />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });
  it('rejects disabled select values without rendering native option dropdowns', async () => {
    const submit = vi.fn();
    const { container } = render(
      <AIForm
        {...defaults}
        fields={[
          {
            id: 'mode',
            label: 'Mode',
            type: 'select',
            options: [
              { value: 'blocked', label: 'Blocked', disabled: true },
              { value: 'ready', label: 'Ready' },
            ],
          },
        ]}
        values={{ mode: 'blocked' }}
        onSubmit={submit}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveFocus();
    expect(container.querySelector('select:not([aria-hidden="true"])')).toBeNull();
  });
  it.each([
    { label: 'missing version', arrays, identity: undefined },
    { label: 'blank accessible label', fields: [{ id: 'a', label: '   ', type: 'text' }] },
    {
      label: 'cyclic condition',
      fields: [
        { id: 'a', label: 'A', type: 'text', when: { field: 'b', equals: 'yes' } },
        { id: 'b', label: 'B', type: 'text', when: { field: 'a', equals: 'yes' } },
      ],
    },
    {
      label: 'missing dependency',
      fields: [{ id: 'a', label: 'A', type: 'text', when: { field: 'missing', equals: 'yes' } }],
    },
    { label: 'unknown field type', fields: [{ id: 'a', label: 'A', type: 'html' }] },
    {
      label: 'duplicate assignment',
      steps: [
        { id: 'a', title: 'A', fieldIds: ['project'] },
        { id: 'b', title: 'B', fieldIds: ['project'] },
      ],
      step: 'a',
    },
    { label: 'missing assignment', steps: [{ id: 'a', title: 'A', fieldIds: [] }], step: 'a' },
    { label: 'inverted bounds', arrays: [{ ...arrays[0]!, minItems: 4, maxItems: 3 }] },
    {
      label: 'duplicate row identity',
      arrays,
      arrayValues: {
        reviewers: [
          { id: 'r', values: {} },
          { id: 'r', values: {} },
        ],
      },
    },
    {
      label: 'too many rows',
      arrays,
      arrayValues: {
        reviewers: Array.from({ length: 21 }, (_, i) => ({ id: String(i), values: {} })),
      },
    },
    {
      label: 'control budget',
      fields: [],
      arrays: [
        {
          id: 'rows',
          label: 'Rows',
          fields: Array.from({ length: 11 }, (_, i) => ({
            id: String(i),
            label: 'Field',
            type: 'text',
          })),
        },
      ],
      arrayValues: { rows: Array.from({ length: 20 }, (_, i) => ({ id: String(i), values: {} })) },
    },
  ])(
    'rejects $label without exposing data or enabling submission',
    ({ label: _label, ...overrides }) => {
      const { container } = render(
        <AIForm {...defaults} identity={identity} {...(overrides as Partial<AIFormProps>)} />,
      );
      expect(screen.getByRole('alert')).toBeVisible();
      expect(screen.getByRole('button', { name: /^(Continue|Next|Submit)$/ })).toBeDisabled();
      expect(container.querySelector('input,textarea')).toBeNull();
    },
  );
  it('does not silently replace a missing selected step', () => {
    const navigate = vi.fn();
    render(
      <AIForm
        {...defaults}
        identity={identity}
        steps={[{ id: 'a', title: 'A', fieldIds: ['project'] }]}
        step="missing"
        onStepChange={navigate}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('step isn’t available');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('retains bounded inert source and rejects overlong input on submission', async () => {
    const submit = vi.fn();
    const { container } = render(
      <AIForm
        {...defaults}
        values={{ project: '<script>bad()</script>' + 'x'.repeat(10000) }}
        onSubmit={submit}
      />,
    );
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toHaveLength(10000);
    expect(container.querySelector('script')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(submit).not.toHaveBeenCalled();
  });
});
