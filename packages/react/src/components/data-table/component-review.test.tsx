import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('SME component review regressions', () => {
  it('preserves sorting in the table card presentation', async () => {
    const sort = vi.fn();
    render(
      <DataTable
        variant="cards"
        caption="People"
        columns={[{ id: 'name', label: 'Name', sortable: true }]}
        rows={[{ id: '1', cells: { name: 'Alex' } }]}
        sort={{ columnId: 'name', direction: 'asc' }}
        onSort={sort}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sort by Name, currently ascending' }),
    );
    expect(sort).toHaveBeenCalledWith({ columnId: 'name', direction: 'desc' });
    expect(screen.getByText('Alex')).toBeVisible();
  });
});
