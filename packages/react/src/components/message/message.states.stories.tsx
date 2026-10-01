import type { Meta, StoryObj } from '@storybook/react-vite';
import { Specimen } from '../../../../../apps/docs/components/specimen';
const meta = {
  title: 'Unseen UI/Message/States',
  component: Specimen,
  args: { name: 'Message', variant: 'Default' },
} satisfies Meta<typeof Specimen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const InterruptedMessage: Story = { args: { name: 'Message', variant: 'Interrupted' } };
