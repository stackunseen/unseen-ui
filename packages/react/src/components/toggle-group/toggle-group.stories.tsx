import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleGroup } from './toggle-group.js';
import type { ToggleGroupOption } from './toggle-group.js';

const options: ToggleGroupOption[] = [
  { value: 'all', label: 'All', count: 24 },
  { value: 'agents', label: 'Agents', count: 9 },
  { value: 'rag', label: 'RAG', count: 7 },
  { value: 'evaluation', label: 'Evaluation', count: 5 },
  { value: 'archive', label: 'Archive', disabled: true },
];
const meta = {
  title: 'Unseen UI/ToggleGroup',
  component: ToggleGroup,
  args: { label: 'Topics', options, value: 'all', onValueChange: () => {} },
} satisfies Meta<typeof ToggleGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

function Single({ variant, size }: { variant?: 'pills' | 'segmented'; size?: 'default' | 'sm' }) {
  const [value, setValue] = useState<string | null>('all');
  return (
    <ToggleGroup
      label="Topics"
      options={options}
      value={value}
      onValueChange={setValue}
      variant={variant}
      size={size}
    />
  );
}
function Multiple() {
  const [value, setValue] = useState<readonly string[]>(['agents']);
  return (
    <ToggleGroup
      type="multiple"
      label="Topics"
      options={options}
      value={value}
      onValueChange={setValue}
    />
  );
}

export const Pills: Story = { render: () => <Single /> };
export const Segmented: Story = { render: () => <Single variant="segmented" /> };
export const Small: Story = { render: () => <Single size="sm" /> };
export const MultipleSelection: Story = { render: () => <Multiple /> };
