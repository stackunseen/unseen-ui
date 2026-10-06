import type { Meta, StoryObj } from '@storybook/react-vite';
import { componentVariants } from '@stackunseen/ui';
import { VariantGallery } from '../../../../../.storybook/fixtures/variant-gallery';
const meta = {
  title: 'Unseen UI/Attachment/Variants',
  component: VariantGallery,
  args: { name: 'Attachment' },
  argTypes: {
    name: { control: 'select', options: Object.keys(componentVariants) },
    dark: { control: 'boolean' },
  },
} satisfies Meta<typeof VariantGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ImageAttachments: Story = { args: { name: 'Attachment', state: 'Image' } };
export const RevokedAttachments: Story = {
  args: { name: 'Attachment', state: 'Revoked', dark: true },
};
export const UploadProgress: Story = { args: { name: 'Attachment', state: 'Uploading' } };
