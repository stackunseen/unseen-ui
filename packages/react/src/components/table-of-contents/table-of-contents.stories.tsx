import type { Meta, StoryObj } from '@storybook/react-vite';
import { TableOfContents } from './table-of-contents.js';

const items = [
  { id: 'why', title: 'Why evals' },
  {
    id: 'datasets',
    title: 'Datasets',
    items: [
      { id: 'golden', title: 'Golden sets' },
      { id: 'synthetic', title: 'Synthetic cases' },
    ],
  },
  { id: 'scoring', title: 'Scoring' },
  { id: 'reporting', title: 'Reporting' },
];

const meta = {
  title: 'Unseen UI/TableOfContents',
  component: TableOfContents,
  args: { items, numbered: true, showReading: true },
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }}>
      <div style={{ position: 'sticky', top: 16, alignSelf: 'start' }}>
        <TableOfContents {...args} />
      </div>
      <article>
        {items.map((item) => (
          <section key={item.id}>
            <h2 id={item.id} style={{ marginBlockStart: 0 }}>
              {item.title}
            </h2>
            <p style={{ height: 320 }}>Section body for {item.title}.</p>
            {item.items?.map((sub) => (
              <section key={sub.id}>
                <h3 id={sub.id}>{sub.title}</h3>
                <p style={{ height: 320 }}>Sub-section body for {sub.title}.</p>
              </section>
            ))}
          </section>
        ))}
      </article>
    </div>
  ),
} satisfies Meta<typeof TableOfContents>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tracking: Story = {};
export const AlwaysCollapsible: Story = { args: { collapsible: 'always', numbered: false } };
export const Controlled: Story = { args: { activeId: 'scoring', showReading: false } };
