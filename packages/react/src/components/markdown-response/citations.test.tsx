import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Source } from '@stackunseen/ui-core';
import { MarkdownResponse } from './markdown-response.js';

const sources: Source[] = [
  {
    id: 's1',
    title: 'Search benchmark',
    kind: 'web',
    version: '1',
    locator: 'p1',
    access: 'available',
    url: 'https://example.com/bench',
  },
  {
    id: 's2',
    title: 'Pricing page',
    kind: 'web',
    version: '1',
    locator: 'p2',
    access: 'available',
    url: 'https://example.com/pricing',
  },
];

describe('MarkdownResponse inline citations', () => {
  it('turns [n] markers into citations and leaves code and unknown numbers alone', () => {
    const { container } = render(
      <MarkdownResponse
        text={'Search is fast [1] and cheap [2].\n\nIn code: `items[1]`. Unknown source [9].'}
        state="complete"
        citations={sources}
      />,
    );
    expect(screen.getByRole('button', { name: 'Source 1: Search benchmark' })).toHaveTextContent(
      '[1]',
    );
    expect(screen.getByRole('button', { name: 'Source 2: Pricing page' })).toBeInTheDocument();
    expect(container.querySelector('code')).toHaveTextContent('items[1]');
    expect(container).toHaveTextContent('Unknown source [9].');
    expect(screen.queryByRole('button', { name: /Source 9/ })).toBeNull();
  });

  it('opens the cited source', async () => {
    const user = userEvent.setup();
    render(<MarkdownResponse text="See [2]." state="complete" citations={sources} />);
    await user.click(screen.getByRole('button', { name: 'Source 2: Pricing page' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Pricing page');
  });

  it('changes nothing without citations', () => {
    const { container } = render(<MarkdownResponse text="Plain [1] text." state="complete" />);
    expect(container).toHaveTextContent('Plain [1] text.');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
