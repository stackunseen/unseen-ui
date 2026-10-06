import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RichMarkdownResponse } from '@stackunseen/ui/rich-markdown';

vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
);

describe('optional math and diagram boundaries', () => {
  it('renders inline and display math in Markdown and preserves code copying', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RichMarkdownResponse
        text={'Inline $x^2$.\n\n$$\n\\frac{1}{2}\n$$\n\n```ts\nconst ok = true;\n```'}
        state="complete"
      />,
    );
    expect(container.querySelectorAll('math')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Copy ts code' }));
    expect(await screen.findByText('Code copied')).toBeVisible();
  });
});
