import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownCodeBlock } from '@ai-interaction/react/markdown';

vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
);

describe('optional math and diagram boundaries', () => {
  it.each(['panel', 'minimal', 'numbered'] as const)(
    '%s standalone code copies the original source',
    async (variant) => {
      const user = userEvent.setup();
      const source = 'const x = 1;\nconst y = 2;';
      render(<MarkdownCodeBlock variant={variant} language="ts" code={source} />);
      await user.click(screen.getByRole('button', { name: 'Copy ts code' }));
      expect(await navigator.clipboard.readText()).toBe(source);
    },
  );
});
