import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToggleGroup } from './toggle-group.js';

afterEach(cleanup);
const options = [
  { value: 'all', label: 'All', count: 12 },
  { value: 'agents', label: 'Agents', count: 4 },
  { value: 'rag', label: 'RAG', disabled: true },
  { value: 'evaluation', label: 'Evaluation', count: 2 },
];

describe('ToggleGroup', () => {
  it('uses radio semantics for single selection and moves selection with arrow keys', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ToggleGroup label="Topics" options={options} value="all" onValueChange={onValueChange} />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Topics' });
    const all = screen.getByRole('radio', { name: 'All 12' });
    expect(all).toHaveAttribute('aria-checked', 'true');
    expect(all).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Agents 4' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'RAG' })).toBeDisabled();
    expect(group).toBeInTheDocument();
    await user.tab();
    expect(all).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Agents 4' })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('agents');
    // The disabled option is skipped.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Evaluation 2' })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('evaluation');
    await user.keyboard('{Home}');
    expect(all).toHaveFocus();
    // Clicking the checked chip keeps it unless allowEmpty is set.
    onValueChange.mockClear();
    await user.click(all);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('allows an empty single selection when requested', async () => {
    const onValueChange = vi.fn();
    render(
      <ToggleGroup
        label="Topics"
        options={options}
        value="all"
        allowEmpty
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'All 12' }));
    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('allowEmpty');
  });

  it('uses pressed buttons for multiple selection and toggles with the keyboard', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ToggleGroup
        type="multiple"
        label="Topics"
        variant="segmented"
        size="sm"
        options={options}
        value={['agents']}
        onValueChange={onValueChange}
      />,
    );
    const group = screen.getByRole('group', { name: 'Topics' });
    expect(group).toHaveAttribute('data-variant', 'segmented');
    expect(group).toHaveAttribute('data-size', 'sm');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const agents = screen.getByRole('button', { name: 'Agents 4', pressed: true });
    await user.tab();
    expect(screen.getByRole('button', { name: 'All 12' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(agents).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
    await user.keyboard(' ');
    expect(onValueChange).toHaveBeenLastCalledWith([]);
    await user.keyboard('{End}');
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith(['agents', 'evaluation']);
    rerender(
      <ToggleGroup
        type="multiple"
        label="Topics"
        options={options}
        value={[]}
        disabled
        onValueChange={onValueChange}
      />,
    );
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});
