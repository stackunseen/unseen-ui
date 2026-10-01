import type { Meta, StoryObj } from '@storybook/react-vite';
import { Specimen } from '../../../../../apps/docs/components/specimen';
const meta = {
  title: 'Unseen UI/SourceCard/States',
  component: Specimen,
  args: { name: 'SourceCard', variant: 'Default' },
} satisfies Meta<typeof Specimen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RevokedSource: Story = { args: { name: 'SourceCard', variant: 'Revoked' } };
