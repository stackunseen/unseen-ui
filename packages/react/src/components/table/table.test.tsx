import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Table } from './table.js';

describe('website surface composition', () => {
  it('retains native header associations and keyboard access to host sorting and scrolling', async () => {
    const sort = vi.fn();
    const ref = createRef<HTMLTableElement>();
    render(
      <>
        <Table label="Invoices" ref={ref} dir="rtl">
          <Table.Caption>Amounts in USD, excluding tax.</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.Head>Invoice</Table.Head>
              <Table.Head aria-sort="ascending">
                <button onClick={sort}>Sort amount</button>
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Head scope="row">INV-001</Table.Head>
              <Table.Cell>12.00</Table.Cell>
            </Table.Row>
          </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.Head scope="row">Total</Table.Head>
              <Table.Cell>12.00</Table.Cell>
            </Table.Row>
          </Table.Footer>
        </Table>
        <button>After table</button>
      </>,
    );
    const table = screen.getByRole('table', { name: 'Invoices' });
    expect(ref.current).toBe(table);
    expect(table).toHaveAttribute('dir', 'rtl');
    expect(within(table).getByRole('columnheader', { name: 'Sort amount' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(within(table).getByRole('rowheader', { name: 'INV-001' })).toHaveAttribute(
      'scope',
      'row',
    );
    expect(table.querySelector('caption')).toHaveTextContent('Amounts in USD, excluding tax.');
    await userEvent.tab();
    expect(screen.getByRole('region', { name: 'Invoices table scroll area' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(sort).toHaveBeenCalledTimes(1);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After table' })).toHaveFocus();
  });

  it('lets hosts express loading/empty data without replacing the focused scroll region', () => {
    const view = (loading: boolean) => (
      <Table label="Search results" aria-busy={loading}>
        <Table.Header>
          <Table.Row>
            <Table.Head>Title</Table.Head>
            <Table.Head>Owner</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell colSpan={2}>{loading ? 'Loading results…' : 'No matches.'}</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
    const { rerender } = render(view(true));
    const region = screen.getByRole('region');
    region.focus();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    rerender(view(false));
    expect(region).toHaveFocus();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('cell', { name: 'No matches.' })).toHaveAttribute('colspan', '2');
  });
});
