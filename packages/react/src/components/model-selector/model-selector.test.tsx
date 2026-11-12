import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModelSelector } from './model-selector.js';

const models = [
  { id: 'a', name: 'Alpha', provider: 'One', description: 'Fast' },
  { id: 'b', name: 'Beta', provider: 'One' },
  { id: 'c', name: 'Gamma', provider: 'Two', disabledReason: 'Not on your plan' },
];

function Harness({ onChange }: { onChange: (id: string) => void }) {
  const [value, setValue] = useState('a');
  return (
    <ModelSelector
      models={models}
      value={value}
      searchable
      onValueChange={(id) => {
        setValue(id);
        onChange(id);
      }}
    />
  );
}

describe('ModelSelector', () => {
  it('names the trigger by the current model and groups options by provider', async () => {
    render(<Harness onChange={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Model: Alpha' }));
    const menu = screen.getByRole('dialog', { name: 'Model' });
    expect(within(menu).getByRole('group', { name: 'One' })).toBeVisible();
    expect(within(menu).getByRole('radio', { name: /Alpha/ })).toBeChecked();
    const gamma = within(menu).getByRole('radio', { name: /Gamma/ });
    expect(gamma).toBeDisabled();
    expect(within(menu).getByText('Not on your plan')).toBeVisible();
  });

  it('keeps the menu open while arrow keys move the choice, and closes on Enter', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Model: Alpha' }));
    screen.getByRole('radio', { name: /Alpha/ }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(screen.getByRole('dialog', { name: 'Model' })).toBeVisible();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Model: Beta' })).toBeVisible();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('selects and closes on a pointer press', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Model: Alpha' }));
    await userEvent.click(screen.getByRole('radio', { name: /Beta/ }));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filters by search, says when nothing matches and clears the search on close', async () => {
    render(<Harness onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: 'Model: Alpha' });
    await userEvent.click(trigger);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search models' }), 'zzz');
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('No models match.')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(trigger);
    expect(screen.getByRole('searchbox', { name: 'Search models' })).toHaveValue('');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('says none is selected when the value matches no model', () => {
    render(<ModelSelector models={models} value="missing" onValueChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Model: none selected' })).toHaveTextContent(
      'Choose a model',
    );
  });
});
