import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper } from './stepper.js';
import { Disclosure } from '../disclosure/disclosure.js';
import { Matrix } from '../matrix/matrix.js';
import { Tag } from '../tag/tag.js';

const steps = [
  { id: '1', label: 'Why evals', href: '#1', state: 'done' as const },
  { id: '2', label: 'Datasets', href: '#2', state: 'current' as const },
  { id: '3', label: 'Scoring', href: '#3' },
  { id: '4', label: 'Reporting', state: 'planned' as const },
];
const meta = {
  title: 'Unseen UI/Stepper, Disclosure and Matrix',
  component: Stepper,
  args: { label: 'Series parts', steps },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Dots: Story = {
  args: { reading: true, previous: { href: '#1' }, next: { href: '#3', label: 'Scoring' } },
};
export const List: Story = { args: { presentation: 'list' } };
export const Segments: Story = {
  args: { presentation: 'segments', tooltip: true, reading: true },
};

function ControlledDisclosure() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
      <Disclosure summary="Overview" open={open} onOpenChange={setOpen}>
        <p>The host owns this state; the summary reports toggles.</p>
      </Disclosure>
      <Disclosure summary="More facets" variant="plain" defaultOpen>
        <p>Uncontrolled, open by default.</p>
      </Disclosure>
    </div>
  );
}
export const Disclosures: Story = { render: () => <ControlledDisclosure /> };

const rows = ['RAG', 'Agents', 'Evals', 'Observability'].map((label) => ({
  id: label.toLowerCase(),
  label,
  href: `#${label}`,
}));
const columns = ['Guides', 'Tools', 'Patterns', 'Reports'].map((label) => ({
  id: label.toLowerCase(),
  label,
}));
const sample: Record<string, number | null> = {
  'rag:guides': 6,
  'rag:tools': 2,
  'agents:guides': 3,
  'agents:patterns': 4,
  'evals:reports': 1,
  'observability:tools': 5,
};
export const Heatmap: Story = {
  render: () => (
    <Matrix
      label="Coverage"
      caption="Entries per discipline and kind"
      rows={rows}
      columns={columns}
      value={(row, column) => sample[`${row.id}:${column.id}`] ?? null}
      href={(row, column) => `#${row.id}-${column.id}`}
    />
  ),
};
export const TagHues: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Tag hue="#b45309">Evaluation</Tag>
      <Tag hue="hsl(200 70% 45%)">Retrieval</Tag>
      <Tag mono>v0.1.0-alpha.2</Tag>
    </div>
  ),
};
