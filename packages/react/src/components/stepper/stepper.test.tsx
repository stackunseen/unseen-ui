import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Stepper } from './stepper.js';
import { Disclosure } from '../disclosure/disclosure.js';
import { Matrix } from '../matrix/matrix.js';
import { Tag } from '../tag/tag.js';

afterEach(cleanup);
const steps = [
  { id: '1', label: 'Why evals', href: '/series/evals/1/', state: 'done' as const },
  { id: '2', label: 'Datasets', href: '/series/evals/2/', state: 'current' as const },
  { id: '3', label: 'Scoring', href: '/series/evals/3/' },
  { id: '4', label: 'Reporting', state: 'planned' as const },
];

describe('Stepper', () => {
  it('renders an accessible list of dots with labels, states, reading and links', () => {
    render(
      <Stepper
        label="Series parts"
        steps={steps}
        reading
        previous={{ href: '/series/evals/1/' }}
        next={{ href: '/series/evals/3/', label: 'Scoring' }}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Series parts' });
    expect(within(nav).getByText('Step 2 of 4')).toBeInTheDocument();
    const items = within(nav).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(nav).getByRole('link', { name: 'Why evals, completed' })).toHaveAttribute(
      'href',
      '/series/evals/1/',
    );
    expect(within(nav).getByRole('link', { name: 'Datasets, current' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(within(nav).getByText('Reporting, planned').closest('a')).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Previous' })).toHaveAttribute('rel', 'prev');
    expect(within(nav).getByRole('link', { name: 'Scoring' })).toHaveAttribute('rel', 'next');
  });

  it('prints labels in list presentation and renders on the server', () => {
    const html = renderToString(
      <Stepper label="Path" steps={steps} presentation="list" reading={(c, t) => `${c}/${t}`} />,
    );
    expect(html).toContain('2/4');
    expect(html).toContain('aria-current="step"');
    render(<Stepper label="Path" steps={steps} presentation="list" />);
    expect(screen.getByText('Scoring')).toBeVisible();
  });
});

describe('Disclosure', () => {
  it('uses native details semantics and reports toggles to a controlled host', async () => {
    const onOpenChange = vi.fn();
    const { container, rerender } = render(
      <Disclosure summary={<strong>Overview</strong>} open={false} onOpenChange={onOpenChange}>
        <p>Folded content</p>
      </Disclosure>,
    );
    const details = container.querySelector('details')!;
    expect(details.open).toBe(false);
    await userEvent.click(screen.getByText('Overview'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(details.open).toBe(false);
    rerender(
      <Disclosure summary={<strong>Overview</strong>} open onOpenChange={onOpenChange}>
        <p>Folded content</p>
      </Disclosure>,
    );
    expect(details.open).toBe(true);
    expect(screen.getByText('Folded content')).toBeVisible();
  });

  it('opens by default when uncontrolled', () => {
    const { container } = render(
      <Disclosure summary="More" defaultOpen variant="plain">
        <p>Shown</p>
      </Disclosure>,
    );
    expect(container.querySelector('details')!.open).toBe(true);
    expect(container.querySelector('[data-part="disclosure"]')).toHaveAttribute(
      'data-variant',
      'plain',
    );
  });
});

describe('Matrix', () => {
  const rows = [
    { id: 'rag', label: 'RAG', href: '/d/rag/' },
    { id: 'evals', label: 'Evals' },
  ];
  const columns = [
    { id: 'guide', label: 'Guides', href: '/k/guide/' },
    { id: 'tool', label: 'Tools' },
  ];
  const counts: Record<string, number | null> = {
    'rag:guide': 4,
    'rag:tool': 1,
    'evals:guide': null,
    'evals:tool': 2,
  };
  it('is a real table with scoped headers, printed numbers, levels and cell links', () => {
    render(
      <Matrix
        label="Coverage"
        caption="Entries per discipline and kind"
        rows={rows}
        columns={columns}
        value={(row, column) => counts[`${row.id}:${column.id}`] ?? null}
        href={(row, column) => `/j/?d=${row.id}&k=${column.id}`}
      />,
    );
    const table = screen.getByRole('table', { name: 'Coverage' });
    expect(screen.getByRole('region', { name: 'Coverage table scroll area' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(within(table).getByRole('columnheader', { name: 'Guides' })).toContainElement(
      within(table).getByRole('link', { name: 'Guides' }),
    );
    expect(within(table).getByRole('rowheader', { name: 'RAG' })).toBeInTheDocument();
    const strongest = within(table).getByRole('link', { name: '4' });
    expect(strongest.closest('td')!.style.getPropertyValue('--matrix-level')).toBe('1');
    expect(
      within(table)
        .getByRole('link', { name: '1' })
        .closest('td')!
        .style.getPropertyValue('--matrix-level'),
    ).toBe('0.25');
    const empty = within(table)
      .getAllByRole('cell')
      .find((cell) => cell.hasAttribute('data-empty'));
    expect(empty).toBeDefined();
    expect(within(empty!).queryByRole('link')).toBeNull();
    expect(within(table).getByText('Entries per discipline and kind').tagName).toBe('CAPTION');
  });
});

describe('Tag hue and mono', () => {
  it('applies a custom hue and monospace metadata styling', () => {
    render(
      <Tag hue="var(--hue-rag)" mono>
        v0.1.0
      </Tag>,
    );
    const tag = screen.getByText('v0.1.0').closest('[data-part="tag"]') as HTMLElement;
    expect(tag).toHaveAttribute('data-tone', 'hue');
    expect(tag).toHaveAttribute('data-mono', 'true');
    expect(tag.style.getPropertyValue('--tag-hue')).toBe('var(--hue-rag)');
  });
});
