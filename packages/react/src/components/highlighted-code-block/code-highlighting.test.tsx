import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HighlightedCodeBlock } from '@ai-interaction/react/highlight';

import { tokenizeCode } from '../../shared/code-highlighting/highlight-engine.js';

afterEach(() => vi.unstubAllGlobals());

describe('real optional tokenizer', () => {
  it.each([
    'javascript',
    'typescript',
    'jsx',
    'tsx',
    'json',
    'css',
    'html',
    'python',
    'bash',
    'sql',
  ] as const)('preserves inert source for %s using the maintained grammar', async (language) => {
    const source = '<script>alert("inert")</script>\nconst value = 1;\n';
    const lines = await tokenizeCode(source, language, () => true);
    expect(lines?.map((line) => line.map((token) => token.text).join('')).join('\n')).toBe(source);
    expect(
      lines
        ?.flat()
        .every((token) =>
          ['text', 'comment', 'keyword', 'string', 'constant'].includes(token.tone),
        ),
    ).toBe(true);
  });
  it.each(['panel', 'minimal', 'numbered'] as const)(
    'renders tokens as text and copies original CRLF in %s',
    async (variant) => {
      const source = 'const value = "<img src=x onerror=alert(1)>";\r\n// preserve original\r\n';
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      const { container } = render(
        <HighlightedCodeBlock code={source} language="ts" variant={variant} />,
      );
      await waitFor(() =>
        expect(container.querySelector('[data-highlighting="highlighted"]')).not.toBeNull(),
      );
      expect(container.querySelectorAll('img,script,[onerror]')).toHaveLength(0);
      expect(container.querySelector('[data-code-token="keyword"]')).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Copy ts code' }));
      await screen.findByText('Code copied');
      expect(writeText).toHaveBeenCalledWith(source);
      expect(screen.getByRole('group', { name: 'ts code' })).toHaveAttribute('tabindex', '0');
    },
  );
  it('keeps preview truncation explicit and never copies partial oversized source', () => {
    render(<HighlightedCodeBlock code={'x'.repeat(100001)} language="ts" />);
    expect(screen.getByText('Code preview truncated at 100,000 characters.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Copy ts code' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'ts code' }).textContent).toHaveLength(100000);
  });
});
