import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ContextInspector } from './context-inspector.js';
import { contextInspection } from '../../../../../apps/docs/lib/inspection-fixtures';

describe('ContextInspector table reading', () => {
  it('retains real row/column headers and complete inert explanations inside the keyboard scroll region', async () => {
    const reason = '<script>untrusted()</script> ' + 'Resource-version-'.repeat(100);
    const item = { ...contextInspection.items[0]!, label: 'Long source', reason };
    render(<ContextInspector variant="table" value={{ ...contextInspection, items: [item] }} />);
    const region = screen.getByRole('region', { name: 'Context source breakdown' });
    const table = within(region).getByRole('table', { name: 'Sources in context' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Source', 'Selection', 'Inclusion', 'Tokens and details']);
    const header = within(table).getByRole('rowheader', { name: /Long source/ });
    expect(header).toHaveAttribute('scope', 'row');
    const row = header.closest('tr')!;
    expect(within(row).getByText(reason)).toBeVisible();
    expect(row.querySelector('script')).toBeNull();
    region.focus();
    expect(region).toHaveFocus();
    await userEvent.tab();
    expect(region).not.toHaveFocus();
  });

  it('preserves reading focus and row identity when the host updates access and explanation', () => {
    const item = {
      ...contextInspection.items[0]!,
      label: 'Current source',
      reason: 'Original explanation',
    };
    const { rerender } = render(
      <ContextInspector variant="table" value={{ ...contextInspection, items: [item] }} />,
    );
    const region = screen.getByRole('region', { name: 'Context source breakdown' });
    const row = screen.getByRole('rowheader', { name: /Current source/ }).closest('tr');
    region.focus();
    rerender(
      <ContextInspector
        variant="table"
        value={{
          ...contextInspection,
          items: [{ ...item, access: 'revoked', reason: 'Access was revoked by the host.' }],
        }}
      />,
    );
    expect(screen.getByRole('region', { name: 'Context source breakdown' })).toBe(region);
    expect(region).toHaveFocus();
    expect(screen.getByRole('rowheader', { name: /Current source/ }).closest('tr')).toBe(row);
    expect(within(row!).getByText('Inclusion unverified')).toBeVisible();
    expect(within(row!).getByText('Access was revoked by the host.')).toBeVisible();
    expect(screen.queryByText('Original explanation')).not.toBeInTheDocument();
  });

  it('keeps filtered table results tied to current host data and restores focus from the picker', async () => {
    const included = {
      ...contextInspection.items[0]!,
      id: 'one',
      label: 'Included source',
      inclusion: 'included' as const,
      access: 'available' as const,
    };
    const excluded = {
      ...included,
      id: 'two',
      label: 'Excluded source',
      inclusion: 'excluded' as const,
      reason: 'The host omitted this version.',
    };
    render(
      <ContextInspector
        variant="table"
        value={{ ...contextInspection, items: [included, excluded] }}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Show context' });
    select.focus();
    await userEvent.keyboard(' {End}{Enter}');
    expect(select).toHaveFocus();
    expect(screen.queryByRole('rowheader', { name: /Included source/ })).not.toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /Excluded source/ })).toBeVisible();
    expect(screen.getByText('The host omitted this version.')).toBeVisible();
  });
});
