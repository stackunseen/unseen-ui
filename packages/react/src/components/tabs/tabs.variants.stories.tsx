import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentVariants } from '@ai-interaction/react';
import { VariantGallery } from '../../../../../.storybook/fixtures/variant-gallery';
const meta = {
  title: 'Unseen UI/Tabs/Variants',
  component: VariantGallery,
  args: { name: 'Tabs' },
  argTypes: {
    name: { control: 'select', options: Object.keys(componentVariants) },
    dark: { control: 'boolean' },
  },
} satisfies Meta<typeof VariantGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TabStyles: Story = { args: { name: 'Tabs' } };
