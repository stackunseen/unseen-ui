import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AITheme,
  Accordion,
  Select,
  IconsProvider,
  AIIcon,
  Button,
  Modal,
} from '../../packages/react/dist/index.js';
import type { SVGProps } from 'react';

function BrandChevron(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function ControlsDemo({ dark = false, customIcons = false }) {
  const [value, setValue] = useState('preview');
  const [open, setOpen] = useState(false);
  const select = (
    <label>
      Environment
      <Select
        value={value}
        onValueChange={setValue}
        options={[
          { value: 'preview', label: 'Preview' },
          { value: 'production', label: 'Production' },
          { value: 'disabled', label: 'Unavailable', disabled: true },
        ]}
      />
    </label>
  );
  return (
    <AITheme
      appearance={dark ? 'dark' : 'light'}
      style={{ padding: 24, maxWidth: 480, background: 'var(--ai-surface)' }}
    >
      <IconsProvider icons={customIcons ? { expand: BrandChevron } : {}}>
        {select}
        <Accordion
          type="multiple"
          items={[
            {
              value: 'inputs',
              title: 'Input parameters',
              content: <p>Public tool arguments appear here.</p>,
            },
            { value: 'disabled', title: 'Unavailable output', disabled: true, content: null },
            {
              value: 'result',
              title: 'Result',
              content: <p>Host-owned state is unchanged by disclosures.</p>,
            },
          ]}
        />
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Preferences"
          description="Nested themed selection"
          trigger={
            <Button variant="outline">
              <AIIcon name="edit" />
              Edit preferences
            </Button>
          }
        >
          {select}
        </Modal>
      </IconsProvider>
    </AITheme>
  );
}
const meta = { title: 'Unseen UI/Shared controls', component: ControlsDemo } satisfies Meta<
  typeof ControlsDemo
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { args: { dark: true } };
export const CustomIcons: Story = { args: { customIcons: true } };
