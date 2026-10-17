'use client';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Chip, ChipGroup, Matrix, Stepper } from '@stackunseen/ui';
import type { WebsiteSpecimenProps } from './website-specimen';

const disciplines = [
  'Retrieval',
  'Orchestration',
  'Evaluation',
  'Observability',
  'Security',
  'Cost',
];
const steps = [
  { id: '1', label: 'Why evals', href: '#part-1', state: 'done' as const },
  { id: '2', label: 'Datasets', href: '#part-2', state: 'current' as const },
  { id: '3', label: 'Scoring', href: '#part-3' },
  { id: '4', label: 'Reporting', state: 'planned' as const },
];
const rows = ['RAG', 'Agents', 'Evals', 'Observability'].map((label) => ({
  id: label.toLowerCase(),
  label,
  href: `#${label.toLowerCase()}`,
}));
const columns = ['Guides', 'Tools', 'Patterns', 'Reports'].map((label) => ({
  id: label.toLowerCase(),
  label,
}));
const manyKinds = [
  'Guides',
  'Tools',
  'Patterns',
  'Reports',
  'Benchmarks',
  'Case studies',
  'Checklists',
  'Templates',
  'Talks',
  'Papers',
  'Datasets',
  'Notebooks',
].map((label) => ({ id: label.toLowerCase().replace(/\s+/g, '-'), label }));
const wide: Record<string, number | null> = Object.fromEntries(
  ['rag', 'agents', 'evals', 'observability'].flatMap((row, r) =>
    manyKinds.map((kind, k) => [
      `${row}:${kind.id}`,
      (r * 5 + k * 3) % 7 === 0 ? null : ((r + 1) * (k + 2)) % 9,
    ]),
  ),
);
type Axis = { id: string; label: string };
const grid = <T,>(cell: (row: Axis, column: Axis) => T) =>
  Object.fromEntries(
    rows.map((row) => [
      row.id,
      Object.fromEntries(columns.map((column) => [column.id, cell(row, column)])),
    ]),
  );
const coverage: Record<string, number | null> = {
  'rag:guides': 6,
  'rag:tools': 2,
  'agents:guides': 3,
  'agents:patterns': 4,
  'evals:reports': 1,
  'observability:tools': 5,
};

export function WebsiteControlSpecimen({ name, state }: WebsiteSpecimenProps) {
  const [stacks, setStacks] = useState(['Next.js', 'Postgres', 'Vercel']);
  if (name === 'Chip') {
    if (state === 'Removable')
      return (
        <ChipGroup label="Active filters">
          {stacks.map((stack) => (
            <Chip
              key={stack}
              onRemove={() => setStacks((current) => current.filter((item) => item !== stack))}
            >
              {stack}
            </Chip>
          ))}
          {stacks.length === 0 && <span className="generic-demo-status">No filters.</span>}
        </ChipGroup>
      );
    const items = state === 'Scrolling group' ? disciplines : disciplines.slice(0, 4);
    const chips = (
      <ChipGroup label="Disciplines" overflow={state === 'Scrolling group' ? 'scroll' : 'wrap'}>
        {items.map((item, index) => (
          <Chip
            key={item}
            href={`#${item.toLowerCase().replace(/\W+/g, '-')}`}
            active={index === 0}
            swatch={`hsl(${index * 50 + 10} 60% 50%)`}
          >
            {item}
          </Chip>
        ))}
      </ChipGroup>
    );
    return state === 'Scrolling group' ? <div style={{ maxWidth: 360 }}>{chips}</div> : chips;
  }
  if (name === 'Stepper')
    return (
      <Stepper
        label="Series parts"
        steps={steps}
        presentation={state === 'List' ? 'list' : state === 'Segments' ? 'segments' : 'dots'}
        reading={state !== 'List'}
        tooltip={state === 'Tooltips' || state === 'Segments'}
        previous={state === 'With navigation' ? { href: '#part-1' } : undefined}
        next={state === 'With navigation' ? { href: '#part-3', label: 'Scoring' } : undefined}
      />
    );
  if (name === 'Matrix')
    return state === 'Plain data' ? (
      <div style={{ '--ai-matrix-max-level': 0.6 } as CSSProperties}>
        <Matrix
          label="Coverage from plain data"
          caption="Counts, links and cell names as grids; fill capped at 60%"
          rows={rows}
          columns={columns}
          values={grid((row, column) => coverage[`${row.id}:${column.id}`] ?? null)}
          hrefs={grid((row, column) => `#${row.id}-${column.id}`)}
          cellLabels={grid(
            (row, column) =>
              `${row.label} × ${column.label}: ${coverage[`${row.id}:${column.id}`] ?? 0} entries`,
          )}
          totals="rows"
          zero="·"
        />
      </div>
    ) : state === 'Totals' ? (
      <Matrix
        label="Coverage with totals"
        rows={rows}
        columns={columns}
        value={(row, column) => coverage[`${row.id}:${column.id}`] ?? null}
        totals="both"
        zero="·"
      />
    ) : state === 'Angled headers' ? (
      <Matrix
        label="Coverage by kind"
        caption="Twelve kinds across four disciplines"
        rows={rows.map((row, index) => ({ ...row, swatch: `hsl(${index * 70 + 20} 60% 50%)` }))}
        columns={manyKinds}
        value={(row, column) => wide[`${row.id}:${column.id}`] ?? null}
        href={(row, column) => `#${row.id}-${column.id}`}
        columnHeader="angled"
        zero="·"
      />
    ) : (
      <Matrix
        label="Coverage"
        caption="Entries per discipline and kind"
        rows={rows}
        columns={columns}
        value={(row, column) => coverage[`${row.id}:${column.id}`] ?? null}
        href={state === 'Linked cells' ? (row, column) => `#${row.id}-${column.id}` : undefined}
      />
    );
  return null;
}
