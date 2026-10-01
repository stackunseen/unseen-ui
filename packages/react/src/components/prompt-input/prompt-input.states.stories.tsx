import type { Meta, StoryObj } from '@storybook/react-vite';
import { Specimen } from '../../../../../apps/docs/components/specimen';
const meta = {
  title: 'Unseen UI/PromptInput/States',
  component: Specimen,
  args: { name: 'PromptInput', variant: 'Default' },
} satisfies Meta<typeof Specimen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Composer: Story = { args: { name: 'PromptInput' } };
