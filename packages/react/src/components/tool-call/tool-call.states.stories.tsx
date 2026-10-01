import type { Meta, StoryObj } from '@storybook/react-vite';
import { Specimen } from '../../../../../apps/docs/components/specimen';
const meta = {
  title: 'Unseen UI/ToolCall/States',
  component: Specimen,
  args: { name: 'ToolCall', variant: 'Default' },
} satisfies Meta<typeof Specimen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ToolError: Story = { args: { name: 'ToolCall', variant: 'Failed' } };
