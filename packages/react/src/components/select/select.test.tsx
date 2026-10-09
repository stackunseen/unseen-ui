import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field, Select, componentVariants } from '@stackunseen/ui';

describe('Select option reuse', () => {
  it.each(componentVariants.Select)(
    '%s reflects replacement options while preserving controlled selection and keyboard focus',
    async (variant) => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const original = [
        { value: 'preview', label: 'Preview' },
        { value: 'production', label: 'Production' },
      ];
      const props = { variant, value: 'preview', onValueChange, 'aria-label': 'Environment' };
      const { rerender } = render(<Select {...props} options={original} />);
      const trigger = screen.getByRole('combobox', { name: 'Environment' });
      await user.tab();
      await user.keyboard('{Enter}');
      const listbox = screen.getByRole('listbox');
      const selected = screen.getByRole('option', { name: 'Preview' });
      expect(selected).toHaveFocus();

      rerender(<Select {...props} options={original} data-host-update="1" />);
      expect(screen.getByRole('listbox')).toBe(listbox);
      expect(selected).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();

      rerender(
        <Select
          {...props}
          options={[
            { value: 'preview', label: 'Updated preview' },
            { value: 'production', label: 'Production unavailable', disabled: true },
            { value: 'staging', label: 'Staging' },
          ]}
        />,
      );
      expect(screen.getByRole('option', { name: 'Updated preview' })).toHaveFocus();
      expect(screen.getByRole('option', { name: 'Production unavailable' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('option', { name: 'Staging' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith('staging');
      expect(trigger).toHaveTextContent('Updated preview');
      expect(trigger).toHaveFocus();
    },
  );
});

describe('Select inside a Field', () => {
  it('takes the field label, description and invalid state like other controls', () => {
    render(
      <Field label="Data region" description="Where records are stored." error="Choose a region.">
        <Select
          value=""
          onValueChange={() => {}}
          options={[{ value: 'eu', label: 'European Union' }]}
          placeholder="Select a region"
        />
      </Field>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Data region' });
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAccessibleDescription('Where records are stored. Choose a region.');
    expect(screen.getByText('Data region').closest('label')).toHaveAttribute(
      'for',
      trigger.getAttribute('id'),
    );
  });
});

describe('Select groups and inline label', () => {
  it('renders labelled option groups and an inline visible label', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        label="Compare"
        value="next"
        onValueChange={onValueChange}
        options={[
          { label: 'Stacks', options: [{ value: 'next', label: 'Next.js' }] },
          {
            label: 'Mixes',
            options: [
              { value: 'mix-a', label: 'Mix A' },
              { value: 'mix-b', label: 'Mix B', disabled: true },
            ],
          },
        ]}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'Compare' });
    expect(screen.getByText('Compare').tagName).toBe('LABEL');
    expect(screen.getByText('Compare')).toHaveAttribute('for', trigger.getAttribute('id'));
    await user.click(trigger);
    expect(screen.getByRole('group', { name: 'Stacks' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Mixes' })).toContainElement(
      screen.getByRole('option', { name: 'Mix A' }),
    );
    expect(screen.getByRole('option', { name: 'Mix B' })).toHaveAttribute('data-disabled');
    await user.click(screen.getByRole('option', { name: 'Mix A' }));
    expect(onValueChange).toHaveBeenCalledWith('mix-a');
  });
});
