import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checklist } from './checklist.js';
import type { ChecklistItem } from './checklist.js';
import { useStoredChecklist } from './use-stored-checklist.js';
import { ProgressRing } from '../progress-ring/progress-ring.js';

const items: ChecklistItem[] = [
  { id: 'scope', title: 'Write the scope', group: 'Plan', eyebrow: 'Step 1' },
  { id: 'owner', title: 'Name an owner', group: 'Plan', detail: 'One person, not a team.' },
  { id: 'eval', title: 'Pick an eval set', group: 'Build', eyebrow: 'Step 3' },
  { id: 'trace', title: 'Trace every run', group: 'Build' },
  { id: 'ship', title: 'Ship behind a flag', group: 'Launch' },
];

const meta = {
  title: 'Unseen UI/Checklist',
  component: Checklist,
  args: { items, label: 'Launch checklist', value: [], onValueChange: () => {} },
} satisfies Meta<typeof Checklist>;
export default meta;
type Story = StoryObj<typeof meta>;

function Local() {
  const [value, setValue] = useState<string[]>(['scope']);
  return (
    <Checklist
      items={items}
      label="Launch checklist"
      value={value}
      onValueChange={setValue}
      rowToggle
      actions={{ copyMarkdown: true, reset: true }}
    />
  );
}
export const HostState: Story = { render: () => <Local /> };

function Stored() {
  const [value, setValue] = useStoredChecklist('storybook:checklist');
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <ProgressRing
        label="Saved in this browser"
        value={value.length}
        max={items.length}
        valueText={`${value.length} of ${items.length}`}
      />
      <Checklist
        items={items}
        label="Launch checklist"
        value={value}
        onValueChange={setValue}
        actions={{ reset: true }}
      />
    </div>
  );
}
export const StoredInBrowser: Story = { render: () => <Stored /> };
