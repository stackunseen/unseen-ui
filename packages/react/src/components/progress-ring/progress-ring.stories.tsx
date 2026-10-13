import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressRing } from './progress-ring.js';

const meta = {
  title: 'Unseen UI/ProgressRing',
  component: ProgressRing,
  args: { label: 'Checklist', value: 3, max: 9, valueText: '3 of 9' },
} satisfies Meta<typeof ProgressRing>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Complete: Story = { args: { value: 9, valueText: '9 of 9' } };
export const Indeterminate: Story = { args: { value: null, valueText: undefined } };
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <ProgressRing {...args} size="sm" />
      <ProgressRing {...args} />
      <ProgressRing {...args} size="lg" labelVisibility="hidden" />
    </div>
  ),
};
