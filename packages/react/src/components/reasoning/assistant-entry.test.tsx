import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ChainOfThought,
  Checkpoint,
  ModelSelector,
  OpenInChat,
  Plan,
  Reasoning,
  Shimmer,
  Sources,
  Task,
  reasoningLabel,
} from '@stackunseen/ui/assistant';

describe('assistant entry', () => {
  it('labels reasoning without inventing a duration', () => {
    expect(reasoningLabel('streaming')).toBe('Thinking…');
    expect(reasoningLabel('complete')).toBe('Reasoning summary');
    expect(reasoningLabel('complete', 3200)).toBe('Thought for 3 seconds');
    expect(reasoningLabel('complete', 400)).toBe('Thought for 1 second');
    expect(reasoningLabel('complete', Number.NaN)).toBe('Reasoning summary');
  });

  it('opens reasoning while streaming and closes it when complete', () => {
    const { rerender } = render(<Reasoning summary={'First.\n\nSecond.'} state="streaming" />);
    const trigger = screen.getByRole('button', { name: /Thinking/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Second.')).toBeVisible();
    rerender(<Reasoning summary={'First.\n\nSecond.'} state="complete" durationMs={2000} />);
    expect(screen.getByRole('button', { name: /Thought for 2 seconds/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('respects controlled reasoning disclosure', async () => {
    const onOpenChange = vi.fn();
    render(<Reasoning summary="Done." state="complete" open={false} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Reasoning summary/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: /Reasoning summary/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('renders chain of thought steps with only safe source links', () => {
    render(
      <ChainOfThought
        steps={[
          {
            id: '1',
            label: 'Search docs',
            state: 'complete',
            sources: [
              { id: 'a', title: 'Safe', href: 'https://example.com' },
              { id: 'b', title: 'Unsafe', href: 'javascript:alert(1)' },
            ],
          },
          { id: '2', label: 'Summarize', state: 'active' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Safe' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(screen.queryByRole('link', { name: 'Unsafe' })).toBeNull();
    expect(screen.getByText('Unsafe')).toBeVisible();
    expect(screen.getByText('Summarize').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('collapses plan steps and keeps actions host-owned', async () => {
    const build = vi.fn();
    render(
      <Plan
        title="Rewrite the docs"
        steps={[
          { id: '1', label: 'Draft', done: true },
          { id: '2', label: 'Review' },
        ]}
        actions={<button onClick={build}>Build</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Rewrite the docs' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Hide plan steps' }));
    expect(screen.queryByText('Review')).not.toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Build' }));
    expect(build).toHaveBeenCalledOnce();
  });

  it('lists task activity and sources', async () => {
    render(
      <>
        <Task title="Found project files" items={[{ id: '1', text: 'Read', file: 'page.tsx' }]} />
        <Sources sources={[{ id: '1', title: 'React docs', href: 'https://react.dev' }]} />
      </>,
    );
    expect(screen.getByText('page.tsx')).toBeVisible();
    const sources = screen.getByRole('button', { name: 'Used 1 source' });
    expect(sources).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(sources);
    expect(screen.getByRole('link', { name: 'React docs' })).toBeVisible();
  });

  it('requests checkpoint restores without claiming success', async () => {
    const onRestore = vi.fn();
    const { rerender } = render(<Checkpoint onRestore={onRestore} />);
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(onRestore).toHaveBeenCalledOnce();
    rerender(<Checkpoint onRestore={onRestore} restoring />);
    expect(screen.getByRole('button', { name: 'Restoring…' })).toBeDisabled();
  });

  it('chooses models through labelled radios and blocks unavailable ones', async () => {
    const onValueChange = vi.fn();
    render(
      <ModelSelector
        value="fast"
        onValueChange={onValueChange}
        models={[
          { id: 'fast', name: 'Fast', provider: 'Demo' },
          { id: 'deep', name: 'Deep', provider: 'Demo' },
          { id: 'old', name: 'Old', provider: 'Demo', disabledReason: 'Retired' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Model: Fast' }));
    expect(screen.getByRole('radio', { name: /Old/ })).toBeDisabled();
    // The native radio stays for semantics and arrow keys but is not drawn; a mark shows the choice.
    const fast = screen.getByRole('radio', { name: /Fast/ });
    expect(fast).toBeChecked();
    expect(fast.className).toContain('optionInput');
    expect(fast.closest('label')).toHaveAttribute('data-checked');
    expect(fast.closest('label')!.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    const deep = screen.getByRole('radio', { name: /Deep/ });
    expect(deep.closest('label')).not.toHaveAttribute('data-checked');
    expect(deep.closest('label')!.querySelector('[aria-hidden="true"] svg')).toBeNull();
    await userEvent.click(deep);
    expect(onValueChange).toHaveBeenCalledWith('deep');
  });

  it('lays task activity out as spaced rows with the file chip beside its text', () => {
    render(
      <Task
        title="Found project files"
        items={[
          { id: '1', text: 'Searching "app/page.tsx"' },
          { id: '2', text: 'Read', file: 'page.tsx' },
        ]}
      />,
    );
    const list = screen.getByRole('list');
    expect(list.className).toContain('list');
    expect(list.className).toContain('content');
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('Read page.tsx');
    expect(rows[1]!.querySelector('[class*="chip"]')).toHaveTextContent('page.tsx');
  });

  it('only offers http destinations for open in chat', async () => {
    render(
      <OpenInChat
        query="hello world"
        destinations={[
          {
            id: 'a',
            label: 'Chat A',
            href: (q) => `https://a.example/?q=${encodeURIComponent(q)}`,
          },
          { id: 'b', label: 'Chat B', href: () => 'javascript:alert(1)' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open in chat' }));
    expect(screen.getByRole('link', { name: 'Chat A' })).toHaveAttribute(
      'href',
      'https://a.example/?q=hello%20world',
    );
    expect(screen.queryByText('Chat B')).toBeNull();
  });

  it('renders shimmer text as plain readable content', () => {
    render(<Shimmer>Loading results</Shimmer>);
    expect(screen.getByText('Loading results')).toBeVisible();
  });
});
