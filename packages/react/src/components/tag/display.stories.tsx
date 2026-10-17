import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './tag.js';
import { Avatar } from '../avatar/avatar.js';
import { Stat, StatGroup } from '../stat/stat.js';
import { Card } from '../card/card.js';
import { LinkButton } from '../link-button/link-button.js';
import { Button } from '../button/button.js';

const meta = {
  title: 'Unseen UI/Display labels and links',
  component: Tag,
} satisfies Meta<typeof Tag>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tags: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Tag>Recommended</Tag>
      <Tag tone="primary">Deep dive</Tag>
      <Tag tone="accent">Advanced</Tag>
      <Tag tone="success">Stable</Tag>
      <Tag tone="warning">Draft</Tag>
      <Tag size="sm">Small</Tag>
    </div>
  ),
};
export const Avatars: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Sam Rivera" />
      <Avatar initials="VK" size="lg" />
      <Avatar />
    </div>
  ),
};
export const Stats: Story = {
  render: () => (
    <StatGroup aria-label="Usage">
      <Stat label="Active users" value="1,204" delta="+12%" trend="up" note="Last 30 days" />
      <Stat label="Errors" value="3" delta="-2" trend="down" />
      <Stat label="Regions" value="5" />
      <Stat label="Uptime" value="99.98%" />
    </StatGroup>
  ),
};
export const LinkCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <Card href="/guides/rag">
        <Card.Title>Retrieval guide</Card.Title>
        <Card.Description>Chunking, ranking and citation patterns.</Card.Description>
      </Card>
      <Card href="https://example.test/spec" external>
        <Card.Title>Specification</Card.Title>
        <Card.Description>External reference.</Card.Description>
      </Card>
    </div>
  ),
};
export const LinkButtons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <LinkButton href="/start">Get started</LinkButton>
      <LinkButton href="/docs" variant="outline">
        Read the docs
      </LinkButton>
      <Button asChild variant="ghost">
        <a href="/pricing">See pricing</a>
      </Button>
    </div>
  ),
};
