import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShareMenu } from './share-menu.js';

const meta = {
  title: 'Unseen UI/ShareMenu',
  component: ShareMenu,
  args: {
    url: 'https://unseenui.com/components/share-menu/',
    title: 'ShareMenu · Unseen UI',
    text: 'Share the current page without tracking parameters.',
  },
} satisfies Meta<typeof ShareMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {};
export const Menu: Story = { args: { presentation: 'menu' } };
export const CustomTargets: Story = {
  args: {
    targets: [
      'copy',
      { id: 'bluesky', label: 'Bluesky', href: 'https://bsky.app/intent/compose?text=Unseen%20UI' },
    ],
  },
};
