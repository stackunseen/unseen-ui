import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button/button.js';
import { Field } from '../field/field.js';
import { Input } from '../input/input.js';
import {
  MarketingContact,
  MarketingFAQ,
  MarketingHero,
  MarketingPricing,
} from './marketing-blocks.js';
import './marketing-blocks.css';

const meta = {
  title: 'Unseen UI/Marketing blocks',
  component: MarketingHero,
  args: {
    title: 'A clear place for your work.',
    eyebrow: 'SAMPLE PRODUCT',
    description: 'Reusable sections, existing theme tokens and your own content.',
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MarketingHero>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Hero: Story = {
  args: {
    actions: <a href="#sample-section">Explore the example</a>,
    children: <div id="sample-section">Your product preview or illustration slot.</div>,
  },
};
export const Plans: Story = {
  render: () => (
    <MarketingPricing
      title="Illustrative plans"
      description="Display content only."
      plans={[
        {
          id: 'personal',
          title: 'Personal',
          description: 'An example for one person.',
          price: '$0',
          features: ['Project notes'],
          action: <Button variant="outline">Example action</Button>,
        },
        {
          id: 'team',
          title: 'Team',
          description: 'An example for a small studio.',
          price: '$12',
          priceNote: 'Sample price per month',
          features: ['Shared project spaces'],
          badge: 'Example badge',
          action: <Button>Example action</Button>,
        },
      ]}
      note="No payments or subscriptions are performed."
    />
  ),
};
function ControlledFAQ() {
  const [value, setValue] = useState('');
  return (
    <MarketingFAQ
      title="Good questions"
      value={value}
      onValueChange={setValue}
      items={[
        {
          value: 'content',
          title: 'Who owns the content?',
          content: 'The application supplies content and actions. These blocks do not fetch data.',
        },
        {
          value: 'styles',
          title: 'How do the styles work?',
          content: 'Import the optional marketing stylesheet and use the shared theme.',
        },
      ]}
    />
  );
}
export const Questions: Story = { render: () => <ControlledFAQ /> };
export const ContactPending: Story = {
  render: () => (
    <MarketingContact
      title="Tell us about your project"
      aria-busy="true"
      feedback={{ tone: 'info', message: 'Host supplied pending state.' }}
      actions={<Button disabled>Sending</Button>}
    >
      <Field label="Email" disabled>
        <Input type="email" value="person@example.test" readOnly />
      </Field>
    </MarketingContact>
  ),
};
