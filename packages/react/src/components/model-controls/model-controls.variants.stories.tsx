import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentVariants } from '@stackunseen/ui';
import { VariantGallery } from '../../../../../.storybook/fixtures/variant-gallery';
const meta = {
  title: 'Unseen UI/ModelControls/Variants',
  component: VariantGallery,
  args: { name: 'ModelControls' },
  argTypes: {
    name: { control: 'select', options: Object.keys(componentVariants) },
    dark: { control: 'boolean' },
  },
} satisfies Meta<typeof VariantGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ModelSettings: Story = { args: { name: 'ModelControls' } };
export const UnsupportedModelSettings: Story = {
  args: { name: 'ModelControls', state: 'Unsupported' },
};
