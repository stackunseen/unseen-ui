import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SegmentedControl } from './segmented-control.js';
import { Chip, ChipGroup } from '../chip/chip.js';

const views = [
  { value: 'latest', label: 'Latest', href: '/journal/' },
  { value: 'discipline', label: 'By discipline', href: '/journal/?view=discipline' },
];
const tiers = [
  { value: 'simple', label: 'Simple' },
  { value: 'production', label: 'Production' },
  { value: 'enterprise', label: 'Enterprise', description: 'Contact sales' },
];
const meta = {
  title: 'Unseen UI/SegmentedControl and Chip',
  component: SegmentedControl,
  args: { label: 'View', options: views, value: 'latest' },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

function Buttons() {
  const [value, setValue] = useState('production');
  return <SegmentedControl label="Tier" options={tiers} value={value} onValueChange={setValue} />;
}
export const ButtonsRadiogroup: Story = { render: () => <Buttons /> };
export const Links: Story = {
  render: () => <SegmentedControl label="View" options={views} value="latest" mode="links" />,
};
export const Small: Story = {
  render: () => (
    <SegmentedControl label="View" options={views} value="latest" mode="links" size="sm" />
  ),
};

function Chips() {
  const [lens, setLens] = useState<string[]>(['agents']);
  const [stacks, setStacks] = useState(['Next.js', 'Postgres']);
  const toggle = (id: string) =>
    setLens((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <ChipGroup label="Lens">
        {['agents', 'rag', 'evaluation'].map((id) => (
          <Chip key={id} pressed={lens.includes(id)} onPressedChange={() => toggle(id)}>
            {id}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Disciplines" overflow="scroll">
        {['Retrieval', 'Orchestration', 'Evaluation', 'Observability', 'Security', 'Cost'].map(
          (name, index) => (
            <Chip
              key={name}
              href={`#${name}`}
              active={index === 0}
              swatch={`hsl(${index * 50} 60% 50%)`}
            >
              {name}
            </Chip>
          ),
        )}
      </ChipGroup>
      <ChipGroup label="Active filters">
        {stacks.map((stack) => (
          <Chip
            key={stack}
            onRemove={() => setStacks((current) => current.filter((item) => item !== stack))}
          >
            {stack}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}
export const ChipVariants: Story = { render: () => <Chips /> };
