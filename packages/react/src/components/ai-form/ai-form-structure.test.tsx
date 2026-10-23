import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AIForm } from '@stackunseen/ui';
import type { AIField, AIFieldArray, AIFormProps } from '@stackunseen/ui';

const identity = { formId: 'review', schemaVersion: '1' };
const fields: AIField[] = [
  { id: 'name', label: 'Project', type: 'text', description: 'Use the project name.' },
  {
    id: 'environment',
    label: 'Environment',
    type: 'select',
    options: [
      { value: 'preview', label: 'Preview' },
      { value: 'production', label: 'Production' },
    ],
  },
];
const arrays: AIFieldArray[] = [
  {
    id: 'reviewers',
    label: 'Reviewers',
    description: 'Choose people who can review this project.',
    fields: [{ id: 'name', label: 'Reviewer name', type: 'text' }],
    minItems: 1,
    reorderable: true,
  },
];
const defaults = {
  fields,
  values: { name: 'Example', environment: 'preview' },
  onValueChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe('AIForm presentation boundaries', () => {
  it.each(['stacked', 'grid', 'compact'] as const)(
    '%s keeps native input identity, focus and selection on host rerenders',
    (variant) => {
      const { rerender } = render(<AIForm {...defaults} variant={variant} />);
      const input = screen.getByRole('textbox', { name: 'Project' }) as HTMLInputElement;
      input.focus();
      input.setSelectionRange(1, 4);
      rerender(<AIForm {...defaults} variant={variant} title="Updated heading" />);
      expect(screen.getByRole('textbox', { name: 'Project' })).toBe(input);
      expect(input).toHaveFocus();
      expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4]);
      expect(input).toHaveAccessibleDescription('Use the project name.');
    },
  );

  it('keeps an open Select and its active option across a host rerender', async () => {
    const change = vi.fn();
    const props = { ...defaults, onValueChange: change };
    const { rerender } = render(<AIForm {...props} />);
    const select = screen.getByRole('combobox', { name: 'Environment' });
    select.focus();
    await userEvent.keyboard(' ');
    const listbox = await screen.findByRole('listbox');
    await userEvent.keyboard('{ArrowDown}');
    const option = screen.getByRole('option', { name: 'Production' });
    expect(option).toHaveFocus();
    rerender(<AIForm {...props} title="Host updated" />);
    expect(screen.getByRole('listbox')).toBe(listbox);
    expect(option).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(change).toHaveBeenCalledExactlyOnceWith({ name: 'Example', environment: 'production' });
    expect(select).toHaveTextContent('Preview');
    expect(select).toHaveFocus();
  });

  it.each(['stacked', 'grid', 'compact'] as const)(
    '%s associates repeatable-group guidance and count validation with the focus target',
    async (variant) => {
      render(
        <AIForm
          {...defaults}
          variant={variant}
          arrays={arrays}
          identity={identity}
          onArrayChange={() => {}}
        />,
      );
      const group = screen.getByRole('group', { name: 'Reviewers' });
      expect(group).toHaveAccessibleDescription('Choose people who can review this project.');
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(group).toHaveFocus();
      expect(group).toHaveAccessibleDescription(
        'Choose people who can review this project. Use 1 to 20 items.',
      );
    },
  );

  it('associates the bounded-preview warning before submission and removes it with corrected data', () => {
    const { rerender } = render(
      <AIForm {...defaults} values={{ name: 'x'.repeat(10001), environment: 'preview' }} />,
    );
    const input = screen.getByRole('textbox', { name: 'Project' }) as HTMLInputElement;
    expect(input.value).toHaveLength(10000);
    expect(input).toHaveAccessibleDescription(
      'Use the project name. The preview shows the first 10,000 characters. Shorten the value before submitting.',
    );
    rerender(<AIForm {...defaults} />);
    expect(screen.getByRole('textbox', { name: 'Project' })).toBe(input);
    expect(input).toHaveAccessibleDescription('Use the project name.');
    expect(screen.queryByText(/Preview limited/)).toBeNull();
  });

  it('preserves each row control and current identity when the host reorders rows', async () => {
    const rows = [
      { id: 'ada', values: { name: 'Ada' } },
      { id: 'grace', values: { name: 'Grace' } },
    ];
    const change = vi.fn();
    const props: AIFormProps = {
      ...defaults,
      identity,
      arrays,
      arrayValues: { reviewers: rows },
      onArrayChange: change,
    };
    const { rerender } = render(<AIForm {...props} />);
    const input = within(screen.getByRole('group', { name: 'Reviewers item 1' })).getByRole(
      'textbox',
    );
    input.focus();
    const currentIdentity = { ...identity, draftVersion: '2' };
    rerender(
      <AIForm
        {...props}
        identity={currentIdentity}
        arrayValues={{ reviewers: [rows[1]!, rows[0]!] }}
      />,
    );
    expect(
      within(screen.getByRole('group', { name: 'Reviewers item 2' })).getByRole('textbox'),
    ).toBe(input);
    expect(input).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Move Reviewers item 2 up' }));
    expect(change).toHaveBeenCalledExactlyOnceWith({
      type: 'move',
      arrayId: 'reviewers',
      rowId: 'ada',
      toIndex: 0,
      identity: currentIdentity,
    });
  });
});
