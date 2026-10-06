import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect } from './multi-select.js';
import type { MultiSelectProps } from './types.js';
import axe from 'axe-core';

const options = [
  { value: 'design', label: 'Design' },
  { value: 'admin', label: 'Administration', disabled: true },
  { value: 'engineering', label: 'Engineering', keywords: ['build'] },
];
const base = {
  label: 'Teams',
  value: [],
  query: '',
  options,
  onQueryChange: vi.fn(),
  onValueChange: vi.fn(),
} satisfies MultiSelectProps;

function Controlled() {
  const [value, setValue] = useState<readonly string[]>([]);
  const [query, setQuery] = useState('');
  return (
    <MultiSelect
      {...base}
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
    />
  );
}

describe('MultiSelect', () => {
  it('toggles enabled options with keyboard, exposes selected state and keeps the popup open', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('combobox', { name: 'Teams' });
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('option', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByRole('option', { name: 'Engineering' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Remove Engineering' })).toBeVisible();
    expect(input).toHaveFocus();
    await user.keyboard('{Home}{Enter}');
    expect(screen.getByRole('option', { name: 'Design' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.queryByRole('button', { name: 'Remove Design' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('requests additions/removals without mutating readonly values or claiming acceptance', async () => {
    const user = userEvent.setup();
    const value = Object.freeze(['design']);
    const change = vi.fn();
    render(<MultiSelect {...base} value={value} onValueChange={change} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Engineering' }));
    expect(change).toHaveBeenLastCalledWith(['design', 'engineering']);
    expect(screen.getByRole('option', { name: 'Engineering' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Remove Design' }));
    expect(change).toHaveBeenLastCalledWith([]);
    expect(screen.getByRole('combobox')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Remove Design' })).toBeVisible();
    expect(value).toEqual(['design']);
  });

  it('deduplicates selected values and options and preserves unavailable selections', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <MultiSelect
        {...base}
        value={['gone', 'design', 'design']}
        options={[...options, options[0]!]}
        onValueChange={change}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText(/details unavailable/)).toBeVisible();
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await user.click(screen.getByRole('option', { name: 'Engineering' }));
    expect(change).toHaveBeenCalledExactlyOnceWith(['gone', 'design', 'engineering']);
  });

  it('updates chip labels from replacement options and filters without removing selected values', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MultiSelect {...base} value={['design']} />);
    await user.click(screen.getByRole('combobox'));
    rerender(
      <MultiSelect
        {...base}
        value={['design']}
        query="build"
        options={[{ value: 'design', label: 'Product design' }, options[2]!]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove Product design' })).toBeVisible();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Engineering');
  });

  it.each(['loading', 'error'] as const)(
    '%s prevents selection but allows query changes and removal of selected values',
    async (status) => {
      const user = userEvent.setup();
      const change = vi.fn();
      const queryChange = vi.fn();
      render(
        <MultiSelect
          {...base}
          value={['design']}
          status={status}
          onValueChange={change}
          onQueryChange={queryChange}
        />,
      );
      const input = screen.getByRole('combobox');
      await user.type(input, 'b');
      expect(queryChange).toHaveBeenCalledExactlyOnceWith('b');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
      await user.keyboard('{Enter}{Escape}');
      expect(change).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Remove Design' }));
      expect(change).toHaveBeenCalledExactlyOnceWith([]);
      expect(screen.getByRole(status === 'loading' ? 'status' : 'alert')).toBeVisible();
    },
  );

  it('blocks disabled option clicks and disables chip removal and input when the whole control is disabled', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(
      <MultiSelect {...base} value={['design']} onValueChange={change} />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Administration' }));
    expect(change).not.toHaveBeenCalled();
    rerender(<MultiSelect {...base} value={['design']} disabled onValueChange={change} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Design' })).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('connects labels and help, supports required/invalid hints and exposes an empty state', async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect
        {...base}
        id="team-picker"
        description="Choose teams for this workspace."
        required
        invalid
        options={[]}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Teams' });
    expect(input).toHaveAttribute('id', 'team-picker');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Choose teams for this workspace/);
    await user.click(input);
    expect(screen.getByRole('status')).toHaveTextContent('No matching options.');
    expect(screen.getByText('No options selected.')).toBeVisible();
  });

  it('has no automated semantic accessibility violations with selected chips and an open popup', async () => {
    const user = userEvent.setup();
    render(<MultiSelect {...base} value={['design']} />);
    await user.click(screen.getByRole('combobox'));
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
