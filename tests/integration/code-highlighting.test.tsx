import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HighlightedCodeBlock } from '@ai-interaction/react/highlight';
import { MarkdownCodeBlock } from '@ai-interaction/react/code';
import { MarkdownCodeBlock as LegacyCode, MarkdownResponse } from '@ai-interaction/react/markdown';

import { RichMarkdownResponse } from '@ai-interaction/react/rich-markdown';

afterEach(() => vi.unstubAllGlobals());

describe('real optional tokenizer', () => {
  it('uses the same canonical plain component for the legacy Markdown entry', () => {
    expect(LegacyCode).toBe(MarkdownCodeBlock);
  });
  it('supports trusted fenced-code composition without executing source', async () => {
    const { container } = render(
      <MarkdownResponse
        text={'```html\n<img src="https://example.invalid/image" onerror="alert(1)">\n```'}
        state="complete"
        renderCodeBlock={(props) => <HighlightedCodeBlock {...props} variant="numbered" />}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
    );
    expect(container.querySelector('img,script')).toBeNull();
    expect(container.querySelector('[data-part="code-block"]')).toHaveAttribute(
      'data-variant',
      'numbered',
    );
    expect(container.querySelector('pre code')?.textContent).toContain('<img');
  });
  it('composes highlighted fences with the specialized math renderer', async () => {
    const { container } = render(
      <RichMarkdownResponse
        text={'A formula $x^2$.\n\n```ts\nconst value = 1;\n```'}
        state="complete"
        renderCodeBlock={(props) => <HighlightedCodeBlock {...props} />}
      />,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
    );
    expect(container.querySelector('math')).not.toBeNull();
    expect(container.querySelector('pre code')?.textContent).toBe('const value = 1;');
  });
});
