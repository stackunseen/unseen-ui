import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppearanceToggle } from './appearance-toggle.js';
import { useResolvedAppearance, useStoredAppearance } from './use-stored-appearance.js';
import { AITheme } from '../../providers/theme/theme-provider.js';
import { Card } from '../card/card.js';

const meta = {
  title: 'Unseen UI/AppearanceToggle',
  component: AppearanceToggle,
  args: { value: 'light', onValueChange: () => {} },
} satisfies Meta<typeof AppearanceToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

function Stored({ variant }: { variant: 'cycle' | 'segmented' }) {
  const [appearance, setAppearance] = useStoredAppearance({ storageKey: 'storybook:appearance' });
  const resolved = useResolvedAppearance(appearance);
  return (
    <AITheme appearance={appearance}>
      <Card style={{ display: 'grid', gap: 12 }}>
        <AppearanceToggle variant={variant} value={appearance} onValueChange={setAppearance} />
        <p style={{ margin: 0 }}>
          Stored: {appearance}. Resolved: {resolved}.
        </p>
      </Card>
    </AITheme>
  );
}
export const Cycle: Story = { render: () => <Stored variant="cycle" /> };
export const Segmented: Story = { render: () => <Stored variant="segmented" /> };
