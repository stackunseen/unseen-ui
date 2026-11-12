import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChainOfThought } from './chain-of-thought.js';
import { Sources } from '../sources/sources.js';
import { Kbd } from '../kbd/kbd.js';

const steps = [
  {
    id: 'a',
    label: 'Searched the docs',
    state: 'complete' as const,
    sources: [
      { id: 's1', title: 'Guide', href: 'https://example.com/guide' },
      { id: 's2', title: 'notes.md' },
      { id: 's3', title: 'Unsafe', href: 'javascript:alert(1)' },
    ],
  },
  { id: 'b', label: 'Comparing results', state: 'active' as const, description: 'Two left' },
  { id: 'c', label: 'Write the answer', state: 'pending' as const },
  { id: 'd', label: 'Fetch pricing', state: 'failed' as const },
];

describe('ChainOfThought', () => {
  it('lists host-reported steps with their state in words and marks the active one', () => {
    render(<ChainOfThought steps={steps} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual([
      'complete',
      'active',
      'pending',
      'failed',
    ]);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[1]).toHaveTextContent('Comparing results (active)');
    expect(items[1]).toHaveTextContent('Two left');
    expect(items[3]).toHaveTextContent('(failed)');
  });

  it('links only http(s) sources and shows the rest as plain text', () => {
    render(<ChainOfThought steps={steps} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/guide');
    expect(links[0]).toHaveAttribute('rel', 'noreferrer noopener');
    expect(screen.getByText('notes.md')).toBeVisible();
    expect(screen.getByText('Unsafe').closest('a')).toBeNull();
  });

  it('collapses, reports the change and says when no steps are reported', async () => {
    const onOpenChange = vi.fn();
    render(<ChainOfThought steps={[]} title="Research" onOpenChange={onOpenChange} />);
    expect(screen.getByText('No steps reported yet.')).toBeVisible();
    const trigger = screen.getByRole('button', { name: 'Research' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('No steps reported yet.')).not.toBeVisible();
  });
});

describe('Sources', () => {
  it('counts sources, opens on request and flags a link it will not render', async () => {
    render(
      <Sources
        sources={[
          { id: '1', title: 'Guide', href: 'https://example.com/', description: 'Setup' },
          { id: '2', title: 'Odd', href: 'ftp://example.com/file' },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Used 2 sources' });
    expect(screen.queryByRole('link')).toBeNull();
    await userEvent.click(trigger);
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(screen.getByText('Odd').closest('a')).toBeNull();
    expect(screen.getByText('Link unavailable')).toBeVisible();
  });

  it('uses the singular and disables the trigger when nothing is reported', () => {
    const { rerender } = render(<Sources sources={[{ id: '1', title: 'Guide' }]} />);
    expect(screen.getByRole('button', { name: 'Used 1 source' })).toBeEnabled();
    rerender(<Sources sources={[]} />);
    expect(screen.getByRole('button', { name: 'No sources reported' })).toBeDisabled();
  });
});

describe('Kbd', () => {
  it('renders one key cap and passes attributes through', () => {
    render(
      <Kbd size="sm" className="mine" title="Enter key">
        Enter
      </Kbd>,
    );
    const key = screen.getByText('Enter');
    expect(key.tagName).toBe('KBD');
    expect(key).toHaveAttribute('data-size', 'sm');
    expect(key).toHaveClass('mine');
    expect(key).toHaveAttribute('title', 'Enter key');
  });
});
