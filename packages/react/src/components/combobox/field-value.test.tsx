import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from './combobox.js';

const options = [
  { value: 'design', label: 'Design' },
  { value: 'research', label: 'Research' },
];

describe('Combobox field value', () => {
  it('shows the chosen label in the field and clears from inside it', async () => {
    const change = vi.fn();
    render(
      <Combobox
        label="Team"
        options={options}
        query=""
        onQueryChange={() => {}}
        value="design"
        onValueChange={change}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Team' });
    expect(input).toHaveAttribute('placeholder', 'Design');
    expect(input).toHaveAccessibleDescription('Selected: Design');
    await userEvent.click(screen.getByRole('button', { name: 'Clear Team' }));
    expect(change).toHaveBeenCalledWith(null);
    expect(input).toHaveFocus();
  });

  it('keeps the search placeholder when nothing is chosen', () => {
    render(
      <Combobox
        label="Team"
        options={options}
        query=""
        onQueryChange={() => {}}
        value={null}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Team' })).toHaveAttribute(
      'placeholder',
      'Search options',
    );
    expect(screen.queryByRole('button', { name: 'Clear Team' })).toBeNull();
  });
});
