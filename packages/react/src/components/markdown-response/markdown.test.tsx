import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Message } from '@ai-interaction/react';
import { MarkdownResponse } from '@ai-interaction/react/markdown';

describe('optional Markdown responses', () => {
  it('renders semantic GFM with scoped headings, static tasks and a keyboard-scrollable table', () => {
    const { container } = render(
      <MarkdownResponse
        state="complete"
        text={
          '# Result\n\nA **clear** answer with `inline` code.\n\n- [x] Read\n- [ ] Review\n\n> Source summary\n\n| Name | Value |\n| --- | --- |\n| Alpha | 12 |'
        }
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Result' })).toBeVisible();
    expect(container.querySelector('strong')).toHaveTextContent('clear');
    expect(screen.getAllByRole('checkbox').every((box) => (box as HTMLInputElement).disabled)).toBe(
      true,
    );
    expect(screen.getByRole('group', { name: 'Response table' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('checkbox', { name: 'Read' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Review' })).not.toBeChecked();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });
  it('keeps raw HTML/MDX inert and renders images as text without fetching them', () => {
    const source =
      '<iframe src="https://untrusted.example/frame"></iframe>\n\n<script>alert(1)</script>\n\n<Widget onClick={run()} />\n\n![A chart](https://untrusted.example/pixel.svg)';
    const { container } = render(<MarkdownResponse state="complete" text={source} />);
    expect(container.querySelector('iframe,script,img,video,audio,widget')).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script>');
    expect(screen.getByRole('link', { name: /Open image/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
  it.each([
    'javascript:alert%281%29',
    'data:text/html,hello',
    'file:///local',
    '//evil.example',
    '/relative',
    'https://name:secret@example.com',
    'blob:https://example.com/id',
    'mailto:mail@example.com',
  ])('does not activate an unsafe/unsupported link: %s', (url) => {
    render(<MarkdownResponse state="complete" text={`[Untrusted destination](${url})`} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Untrusted destination')).toBeVisible();
  });
  it('retains safe destinations and isolates a new tab', () => {
    render(<MarkdownResponse state="complete" text="[Docs](https://example.com/docs?q=1#api)" />);
    const link = screen.getByRole('link', { name: /Docs/ });
    expect(link).toHaveAttribute('href', 'https://example.com/docs?q=1#api');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName('Docs (opens in a new tab)');
  });
  it('never makes an unfinished link actionable, then activates the completed destination', () => {
    const { rerender } = render(
      <MarkdownResponse state="streaming" text="Read [the policy](https://example.com/pol" />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('the policy')).toBeVisible();
    rerender(
      <MarkdownResponse state="complete" text="Read [the policy](https://example.com/policy)" />,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/policy');
  });
  it('formats incomplete emphasis only during streaming, without changing the supplied source', () => {
    const text = 'A **partial answer';
    const { container, rerender } = render(<MarkdownResponse state="streaming" text={text} />);
    expect(container.querySelector('strong')).toHaveTextContent('partial answer');
    rerender(<MarkdownResponse state="interrupted" text={text} />);
    expect(container.querySelector('strong')).toBeNull();
    expect(container).toHaveTextContent(text);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Response interrupted. Partial content retained.',
    );
  });
  it('preserves existing paragraph nodes across appended chunks', () => {
    const { container, rerender } = render(
      <MarkdownResponse state="streaming" text={'Stable paragraph.\n\nGrowing'} />,
    );
    const first = container.querySelector('p');
    rerender(
      <MarkdownResponse state="streaming" text={'Stable paragraph.\n\nGrowing answer **now'} />,
    );
    expect(container.querySelector('p')).toBe(first);
    expect(first).toHaveTextContent('Stable paragraph.');
  });
  it('disables partial-code copy, then copies completed code and reports clipboard failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { rerender } = render(
      <MarkdownResponse state="streaming" text={'```ts\nconst value = 1;'} />,
    );
    expect(screen.getByRole('button', { name: 'Copy ts code' })).toBeDisabled();
    rerender(<MarkdownResponse state="complete" text={'```ts\nconst value = 1;\n```'} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy ts code' }));
    expect(await screen.findByText('Code copied')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith('const value = 1;');
    writeText.mockRejectedValueOnce(new Error('Permission denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy ts code' }));
    expect(await screen.findByText('Copy unavailable. Select and copy the code.')).toBeVisible();
    rerender(<MarkdownResponse state="complete" text={'```ts\nconst value = 2;\n```'} />);
    expect(screen.queryByText('Copy unavailable. Select and copy the code.')).toBeNull();
  });
  it('keeps footnote identities unique and local to each message', () => {
    const text = 'A claim[^note].\n\n[^note]: A supporting note.';
    const { container } = render(
      <>
        <MarkdownResponse state="complete" text={text} />
        <MarkdownResponse state="complete" text={text} />
      </>,
    );
    const ids = [...container.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    const regions = container.querySelectorAll('[data-part="markdown"]');
    for (const region of regions) {
      for (const anchor of region.querySelectorAll('a[href^="#"]')) {
        const id = anchor.getAttribute('href')!.slice(1);
        expect([...region.querySelectorAll('[id]')].some((node) => node.id === id)).toBe(true);
        const description = anchor.getAttribute('aria-describedby');
        if (description)
          expect([...region.querySelectorAll('[id]')].some((node) => node.id === description)).toBe(
            true,
          );
      }
    }
  });
  it('bounds oversized content as explicit plain text without activating truncated links', () => {
    const { container } = render(
      <MarkdownResponse
        state="complete"
        text={'[Do not activate](https://example.com)\n' + 'x'.repeat(100_000)}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/Response exceeds the formatting limit/)).toBeVisible();
    expect(container.querySelector('pre')?.textContent).toHaveLength(100_000);
  });
  it.each(['cursor', 'dots', 'shimmer'] as const)(
    'retains waiting, error and interruption behavior for %s',
    (variant) => {
      const { rerender } = render(<MarkdownResponse variant={variant} state="streaming" text="" />);
      expect(screen.queryByText('No response content.')).toBeNull();
      rerender(
        <MarkdownResponse
          variant={variant}
          state="interrupted"
          text="**Kept** content."
          error="Connection lost"
        />,
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Connection lost');
      expect(screen.getByText('Kept')).toBeVisible();
    },
  );
  it.each(['plain', 'bubble', 'panel'] as const)(
    'composes in a %s Message while preserving its role/actions and native props',
    (variant) => {
      render(
        <Message
          variant={variant}
          value={{
            id: 'one',
            role: 'assistant',
            text: '**Hello**',
            state: 'complete',
            revision: 1,
          }}
          renderContent={({ text, state }) => <MarkdownResponse text={text ?? ''} state={state} />}
          data-example="rich"
        >
          <button>Review sources</button>
        </Message>,
      );
      const article = screen.getByRole('article', { name: 'assistant message' });
      expect(article).toHaveAttribute('data-variant', variant);
      expect(article).toHaveAttribute('data-example', 'rich');
      expect(within(article).getByText('Hello').tagName).toBe('STRONG');
      expect(within(article).getByRole('button', { name: 'Review sources' })).toBeVisible();
    },
  );
});
