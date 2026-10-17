import { renderToString } from 'react-dom/server';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { Field, Input, Progress, Table, TableRow } from '@stackunseen/ui';
import type { TableRow as ExistingDataRow } from '../../packages/react/src/components/data-table/data-table.js';
import type { TableRowProps } from '@stackunseen/ui';
import { WebsitePublicExample } from '../fixtures/website-public-example.js';

describe('website root API integration', () => {
  it('preserves the existing data-row type while exporting the native row component', () => {
    expectTypeOf<TableRow>().toEqualTypeOf<ExistingDataRow>();
    expectTypeOf<Parameters<typeof TableRow>[0]>().toEqualTypeOf<TableRowProps>();
    expect(TableRow).toBe(Table.Row);
    const row: TableRow = { id: 'legacy', cells: { amount: 12 } };
    expect(row.cells.amount).toBe(12);
    render(
      <>
        <Table label="Native invoices">
          <Table.Body>
            <TableRow>
              <Table.Cell>Native invoice</Table.Cell>
            </TableRow>
          </Table.Body>
        </Table>
        <Field label="Account name" description="Visible to your team">
          <Input value="Sample team" readOnly />
        </Field>
        <Progress label="Invoice processing" value={null} />
      </>,
    );
    expect(
      within(screen.getByRole('table', { name: 'Native invoices' })).getByRole('cell'),
    ).toHaveTextContent('Native invoice');
    expect(screen.getByRole('textbox', { name: 'Account name' })).toHaveAccessibleDescription(
      'Visible to your team',
    );
    expect(screen.getByRole('progressbar', { name: 'Invoice processing' })).not.toHaveAttribute(
      'value',
    );
  });

  it('server-renders the public composition with closed overlays and preserved static meaning', () => {
    const html = renderToString(<WebsitePublicExample />);
    expect(html).toContain('Website public API');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('No archived invoices');
    expect(html).not.toContain('role="alertdialog"');
  });
});
