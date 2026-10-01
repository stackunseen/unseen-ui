import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { MarkdownCodeBlock } from '@ai-interaction/react/code';

afterEach(() => vi.unstubAllGlobals());

describe('real optional tokenizer', () => {
  it('reports missing Clipboard without throwing and clears feedback for a changed source', async () => {
    vi.stubGlobal('navigator', {});
    const { rerender } = render(<MarkdownCodeBlock code="first" language="text" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy text code' }));
    await screen.findByText('Copy unavailable. Select and copy the code.');
    rerender(<MarkdownCodeBlock code="second" language="text" />);
    expect(screen.queryByText('Copy unavailable. Select and copy the code.')).toBeNull();
  });
});
