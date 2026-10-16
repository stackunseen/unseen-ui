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

  it('adds a visible tooltip to dots without changing their accessible names', () => {
    render(<Stepper label="Series parts" steps={steps} tooltip />);
    const link = screen.getByRole('link', { name: 'Datasets, current' });
    const tip = link.querySelector('[aria-hidden="true"]:not(:empty)');
    expect(tip).toHaveTextContent('Datasets');
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveAccessibleName('Datasets, current');
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

  it('angles column headers, prints a zero glyph and shows row swatches', () => {
    render(
      <Matrix
        label="Coverage"
        rows={rows.map((row) => ({ ...row, swatch: `var(--hue-${row.id})` }))}
        columns={columns}
        value={(row, column) => counts[`${row.id}:${column.id}`] ?? null}
        columnHeader="angled"
        zero="·"
      />,
    );
    const table = screen.getByRole('table', { name: 'Coverage' });
    expect(table).toHaveAttribute('data-column-header', 'angled');
    expect(within(table).getByRole('columnheader', { name: 'Guides' })).toContainElement(
      within(table).getByRole('link', { name: 'Guides' }),
    );
    const rag = within(table).getByRole('rowheader', { name: 'RAG' });
    expect(rag.querySelector('[aria-hidden="true"]')).toHaveStyle({ background: 'var(--hue-rag)' });
    const empty = within(table)
      .getAllByRole('cell')
      .find((cell) => cell.hasAttribute('data-empty'))!;
    expect(empty).toHaveTextContent('·');
    expect(empty.querySelector('[aria-hidden="true"]')).toHaveTextContent('·');
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

describe('Stepper follow-ups', () => {
  it('leaves available steps without a state suffix and can render as a plain list', () => {
    render(
      <Stepper
        as="div"
        label="Series parts"
        steps={[
          { id: '1', label: 'Why evals', href: '/1', state: 'available' },
          { id: '2', label: 'Datasets', href: '/2', state: 'current' },
          { id: '3', label: 'Scoring', href: '/3' },
        ]}
      />,
    );
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('list', { name: 'Series parts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Why evals' })).toHaveAttribute('href', '/1');
    expect(screen.getByRole('link', { name: 'Datasets, current' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scoring, upcoming' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Why evals' }).closest('li')).toHaveAttribute(
      'data-state',
      'available',
    );
  });
});

describe('Matrix totals', () => {
  it('prints row and column totals outside the fill scale', () => {
    render(
      <Matrix
        label="Coverage"
        rows={[
          { id: 'rag', label: 'RAG' },
          { id: 'evals', label: 'Evals' },
        ]}
        columns={[
          { id: 'guide', label: 'Guides' },
          { id: 'tool', label: 'Tools' },
        ]}
        value={(row, column) =>
          (
            ({ 'rag:guide': 4, 'rag:tool': 1, 'evals:guide': null, 'evals:tool': 2 }) as Record<
              string,
              number | null
            >
          )[`${row.id}:${column.id}`] ?? null
        }
        totals="both"
      />,
    );
    const table = screen.getByRole('table', { name: 'Coverage' });
    expect(within(table).getByRole('columnheader', { name: 'All' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'All' })).toBeInTheDocument();
    const totals = within(table)
      .getAllByRole('cell')
      .filter((cell) => cell.hasAttribute('data-total'))
      .map((cell) => cell.textContent);
    expect(totals).toEqual(['5', '2', '4', '3', '7']);
    for (const cell of within(table).getAllByRole('cell'))
      if (cell.hasAttribute('data-total'))
        expect(cell.style.getPropertyValue('--matrix-level')).toBe('');
    const strongest = within(table)
      .getAllByText('4')
      .map((node) => node.closest('td')!)
      .find((cell) => !cell.hasAttribute('data-total'))!;
    expect(strongest.style.getPropertyValue('--matrix-level')).toBe('1');
  });
});

describe('Matrix plain data, corner, names and angled padding', () => {
  const rows = [
    { id: 'rag', label: 'RAG' },
    { id: 'evals', label: 'Evals' },
  ];
  const columns = [
    { id: 'guide', label: 'Guides' },
    { id: 'tool', label: 'Tools' },
  ];
  it('takes values, hrefs and cell names as grids and names cells for hover and assistive technology', () => {
    render(
      <Matrix
        label="Coverage"
        rows={rows}
        columns={columns}
        values={{ rag: { guide: 6, tool: 1 }, evals: { tool: 2 } }}
        hrefs={{ rag: { guide: '/j/?d=rag&k=guide' } }}
        cellLabels={{ rag: { guide: 'RAG × Guides: 6 entries' } }}
        cellLabel={(row, column, value) => `${row.id} × ${column.id}: ${value ?? 'none'}`}
      />,
    );
    const table = screen.getByRole('table', { name: 'Coverage' });
    const named = within(table).getByRole('link', { name: 'RAG × Guides: 6 entries' });
    expect(named).toHaveAttribute('href', '/j/?d=rag&k=guide');
    expect(named).toHaveAttribute('title', 'RAG × Guides: 6 entries');
    expect(within(table).getByText('1').closest('span')).toHaveAttribute('title', 'rag × tool: 1');
    const empty = within(table)
      .getAllByRole('cell')
      .find((cell) => cell.hasAttribute('data-empty'))!;
    expect(empty.querySelector('[title]')).toHaveAttribute('title', 'evals × guide: none');
    const corner = table.querySelector('thead td')!;
    expect(corner.className).toContain('matrixCorner');
    expect(corner).not.toHaveAttribute('style');
  });

  it('sizes the angled end padding from the last label', () => {
    const { rerender } = render(
      <Matrix label="Coverage" rows={rows} columns={columns} values={{}} columnHeader="angled" />,
    );
    expect(screen.getByRole('table').style.getPropertyValue('--matrix-end-padding')).toBe('2em');
    rerender(
      <Matrix
        label="Coverage"
        rows={rows}
        columns={[...columns, { id: 'long', label: 'Observability and tracing' }]}
        values={{}}
        columnHeader="angled"
      />,
    );
    expect(screen.getByRole('table').style.getPropertyValue('--matrix-end-padding')).toBe('8.5em');
    rerender(
      <Matrix
        label="Coverage"
        rows={rows}
        columns={columns}
        values={{}}
        columnHeader="angled"
        totals="rows"
        totalsLabel="All"
      />,
    );
    expect(screen.getByRole('table').style.getPropertyValue('--matrix-end-padding')).toBe('2em');
    rerender(<Matrix label="Coverage" rows={rows} columns={columns} values={{}} />);
    expect(screen.getByRole('table').style.getPropertyValue('--matrix-end-padding')).toBe('');
  });
});

describe('Stepper segments', () => {
  it('draws equal-width bars with the same states, links and labels', () => {
    render(
      <Stepper
        label="Series parts"
        presentation="segments"
        tooltip
        steps={[
          { id: '1', label: 'Why evals', href: '/1', state: 'done' },
          { id: '2', label: 'Datasets', href: '/2', state: 'current' },
          { id: '3', label: 'Scoring', href: '/3', state: 'available' },
          { id: '4', label: 'Reporting', state: 'planned' },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Series parts' });
    expect(nav).toHaveAttribute('data-presentation', 'segments');
    expect(nav.querySelector('[class*="stepperDot"]')).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Datasets, current' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(within(nav).getByRole('link', { name: 'Scoring' })).toHaveAttribute('href', '/3');
    expect(within(nav).getByText('Reporting, planned').closest('li')).toHaveAttribute(
      'data-state',
      'planned',
    );
    expect(within(nav).getAllByRole('listitem')).toHaveLength(4);
    expect(
      within(nav)
        .getByRole('link', { name: 'Why evals, completed' })
        .querySelector('[aria-hidden="true"]'),
    ).toHaveTextContent('Why evals');
  });
});
