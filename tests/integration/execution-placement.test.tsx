import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuditTrail, DataTable } from '@ai-interaction/react';

describe('execution content and contextual actions', () => {
  it('load-more rows and records remain explicit requests and lock during loading', async () => {
    const rows = vi.fn(),
      records = vi.fn();
    const fixture = (loading: boolean) => (
      <>
        <AuditTrail
          records={[]}
          query=""
          onQueryChange={() => {}}
          onLoadMore={records}
          loading={loading}
        />
        <DataTable
          caption="Current records"
          columns={[{ id: 'name', label: 'Name' }]}
          rows={[]}
          onLoadMore={rows}
          loading={loading}
        />
      </>
    );
    const { rerender } = render(fixture(false));
    await userEvent.click(screen.getByRole('button', { name: 'Load more records' }));
    await userEvent.click(screen.getByRole('button', { name: 'Load more rows' }));
    expect(records).toHaveBeenCalledOnce();
    expect(rows).toHaveBeenCalledOnce();
    rerender(fixture(true));
    expect(screen.getByRole('button', { name: 'Load more records' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Load more rows' })).toBeDisabled();
  });
});
