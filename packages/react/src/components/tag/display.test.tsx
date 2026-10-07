import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Tag } from './tag.js';
import { Avatar, avatarInitials } from '../avatar/avatar.js';
import { Stat, StatGroup } from '../stat/stat.js';
import { LinkCard } from '../link-card/link-card.js';
import { LinkButton } from '../link-button/link-button.js';
import { Button } from '../button/button.js';

afterEach(cleanup);

describe('Tag', () => {
  it('renders an inert label with tone and size and a decorative icon', () => {
    render(
      <Tag tone="accent" size="sm" icon={<svg data-testid="icon" />}>
        Deep dive
      </Tag>,
    );
    const tag = screen.getByText('Deep dive').closest('[data-part="tag"]')!;
    expect(tag).toHaveAttribute('data-tone', 'accent');
    expect(tag).toHaveAttribute('data-size', 'sm');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('derives two initials and is decorative without a name', () => {
    expect(avatarInitials('Ada Lovelace')).toBe('AL');
    expect(avatarInitials('Prince')).toBe('PR');
    expect(avatarInitials('  ')).toBe('');
    const { container } = render(<Avatar initials="VK" />);
    const avatar = container.querySelector('[data-part="avatar"]')!;
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).not.toHaveAttribute('role');
    expect(avatar).toHaveTextContent('VK');
  });

  it('names itself when a name is supplied and falls back to initials when the image fails', () => {
    render(<Avatar name="Ada Lovelace" src="https://example.test/ada.png" size="lg" />);
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(avatar).toHaveAttribute('data-size', 'lg');
    const image = avatar.querySelector('img')!;
    expect(image).toHaveAttribute('alt', '');
    fireEvent.error(image);
    expect(avatar.querySelector('img')).toBeNull();
    expect(avatar).toHaveTextContent('AL');
  });

  it('shows a generic icon when neither a name nor initials exist', () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

describe('Stat', () => {
  it('renders label, value, trend-marked delta and note inside a group', () => {
    render(
      <StatGroup aria-label="Usage">
        <Stat label="Active users" value="1,204" delta="+12%" trend="up" note="Last 30 days" />
        <Stat label="Errors" value="3" delta="-2" trend="down" />
        <Stat label="Regions" value="5" />
      </StatGroup>,
    );
    expect(screen.getByRole('group', { name: 'Usage' })).toBeInTheDocument();
    expect(screen.getByText('+12%')).toHaveAttribute('data-trend', 'up');
    expect(screen.getByText('-2')).toHaveAttribute('data-trend', 'down');
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(screen.getByText('Regions').nextElementSibling).toHaveTextContent('5');
  });
});

describe('LinkCard', () => {
  it('is one native anchor with title, description and meta', () => {
    render(
      <LinkCard
        href="/guides/rag"
        title="Retrieval guide"
        description="Chunking and ranking."
        meta="12 min"
        icon={<svg data-testid="icon" />}
        variant="row"
      />,
    );
    const link = screen.getByRole('link', { name: /Retrieval guide/ });
    expect(link).toHaveAttribute('href', '/guides/rag');
    expect(link).toHaveAttribute('data-variant', 'row');
    expect(link).not.toHaveAttribute('target');
    expect(link).toHaveTextContent('Chunking and ranking.');
    expect(link).toHaveTextContent('12 min');
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens external links safely while allowing explicit overrides', () => {
    const { rerender } = render(<LinkCard href="https://example.test" title="Docs" external />);
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    rerender(<LinkCard href="https://example.test" title="Docs" external rel="noopener" />);
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('rel', 'noopener');
  });
});

describe('Link buttons', () => {
  it('LinkButton is a native anchor with button presentation', () => {
    render(
      <LinkButton href="/start" variant="outline" size="sm" target="_blank" rel="noreferrer">
        Get started
      </LinkButton>,
    );
    const link = screen.getByRole('link', { name: 'Get started' });
    expect(link).toHaveAttribute('href', '/start');
    expect(link).toHaveAttribute('data-variant', 'outline');
    expect(link).toHaveAttribute('data-size', 'sm');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.tagName).toBe('A');
  });

  it('Button asChild renders the child element with the button presentation', () => {
    render(
      <Button asChild variant="secondary">
        <a href="/pricing">See pricing</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'See pricing' });
    expect(link).toHaveAttribute('data-variant', 'secondary');
    expect(link.className).toContain('button');
    expect(link).not.toHaveAttribute('type');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
