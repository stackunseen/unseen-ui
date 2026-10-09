'use client';
import { useState } from 'react';
import {
  Chip,
  ChipGroup,
  Disclosure,
  Kbd,
  Matrix,
  SegmentedControl,
  SkipLink,
  Stepper,
  VisuallyHidden,
} from '@stackunseen/ui';
import type { WebsiteSpecimenProps } from './website-specimen';

const views = [
  { value: 'latest', label: 'Latest', href: '/components/segmented-control/' },
  {
    value: 'discipline',
    label: 'By discipline',
    href: '/components/segmented-control/?view=discipline',
  },
  { value: 'archive', label: 'Archive', href: '/components/segmented-control/?view=archive' },
];
const tiers = [
  { value: 'simple', label: 'Simple' },
  { value: 'production', label: 'Production' },
  { value: 'enterprise', label: 'Enterprise', description: 'Contact sales' },
];
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
const coverage: Record<string, number | null> = {
  'rag:guides': 6,
  'rag:tools': 2,
  'agents:guides': 3,
  'agents:patterns': 4,
  'evals:reports': 1,
  'observability:tools': 5,
};

export function WebsiteControlSpecimen({ name, state }: WebsiteSpecimenProps) {
  const [tier, setTier] = useState('production');
  const [lens, setLens] = useState<string[]>(['agents']);
  const [stacks, setStacks] = useState(['Next.js', 'Postgres', 'Vercel']);
  const [open, setOpen] = useState(state === 'Open');
  if (name === 'SegmentedControl')
    return state === 'Links' ? (
      <SegmentedControl label="View" options={views} value="latest" mode="links" />
    ) : (
      <SegmentedControl
        label="Tier"
        options={
          state === 'Disabled option'
            ? tiers.map((item) =>
                item.value === 'enterprise' ? { ...item, disabled: true } : item,
              )
            : tiers
        }
        value={tier}
        onValueChange={setTier}
        size={state === 'Small' ? 'sm' : 'default'}
      />
    );
  if (name === 'Chip') {
    const toggle = (id: string) =>
      setLens((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    if (state === 'Links')
      return (
        <ChipGroup label="Disciplines">
          {disciplines.slice(0, 4).map((item, index) => (
            <Chip
              key={item}
              href={`#${item.toLowerCase()}`}
              active={index === 0}
              swatch={`hsl(${index * 50 + 10} 60% 50%)`}
            >
              {item}
            </Chip>
          ))}
        </ChipGroup>
      );
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
    if (state === 'Scrolling group')
      return (
        <div style={{ maxWidth: 360 }}>
          <ChipGroup label="Disciplines" overflow="scroll">
            {disciplines.map((item) => (
              <Chip key={item} pressed={lens.includes(item)} onPressedChange={() => toggle(item)}>
                {item}
              </Chip>
            ))}
          </ChipGroup>
        </div>
      );
    return (
      <ChipGroup label="Lens">
        {['agents', 'rag', 'evaluation'].map((id) => (
          <Chip key={id} pressed={lens.includes(id)} onPressedChange={() => toggle(id)}>
            {id}
          </Chip>
        ))}
      </ChipGroup>
    );
  }
  if (name === 'Stepper')
    return (
      <Stepper
        label="Series parts"
        steps={steps}
        presentation={state === 'List' ? 'list' : 'dots'}
        reading={state !== 'List'}
        tooltip={state === 'Tooltips'}
        previous={state === 'With navigation' ? { href: '#part-1' } : undefined}
        next={state === 'With navigation' ? { href: '#part-3', label: 'Scoring' } : undefined}
      />
    );
  if (name === 'Disclosure')
    return (
      <Disclosure
        summary="Overview"
        open={open}
        onOpenChange={setOpen}
        variant={state === 'Plain' ? 'plain' : 'card'}
      >
        <p>
          The host owns this state. Native details and summary semantics work before hydration; the
          chevron and surface follow the theme.
        </p>
      </Disclosure>
    );
  if (name === 'Matrix')
    return state === 'Angled headers' ? (
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
  if (name === 'Kbd')
    return (
      <p style={{ margin: 0 }}>
        Press <Kbd>/</Kbd> to search and <Kbd>Esc</Kbd> to close. Shortcut: <Kbd>Ctrl</Kbd> +{' '}
        <Kbd>K</Kbd>.
      </p>
    );
  if (name === 'SkipLink')
    return (
      <div style={{ position: 'relative', minHeight: 72 }}>
        <SkipLink href="#skip-link-target">Skip to the sample content</SkipLink>
        <p className="generic-demo-status">
          Tab into this example to reveal the link; it stays hidden until focused.
        </p>
        <p id="skip-link-target" tabIndex={-1} style={{ margin: 0 }}>
          Sample content.
        </p>
      </div>
    );
  return (
    <p style={{ margin: 0 }}>
      Download report <VisuallyHidden>(opens in a new tab)</VisuallyHidden>
      <span aria-hidden="true"> ↗</span>
    </p>
  );
}
