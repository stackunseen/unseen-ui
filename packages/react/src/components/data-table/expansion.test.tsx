import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table.js';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('table sorting emits the requested order while preserving controlled rows', async () => {
    const sort = vi.fn();
    render(
      <DataTable
        columns={[{ id: 'name', label: 'Name', sortable: true }]}
        rows={[
          { id: 'a', cells: { name: 'A' } },
          { id: 'b', cells: { name: 'B' } },
        ]}
        caption="Results"
        sort={{ columnId: 'name', direction: 'asc' }}
        onSort={sort}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sort by Name, currently ascending' }),
    );
    expect(sort).toHaveBeenCalledWith({ columnId: 'name', direction: 'desc' });
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['A', 'B']);
  });
});
