import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Message } from '@stackunseen/ui';
import type { Source, MessageData } from '@stackunseen/ui-core';
import { source } from '../../apps/docs/lib/fixtures';

const original: Source = { ...source, url: 'https://example.com/original' };

const reference = { sourceId: source.id, version: source.version, locator: source.locator };

const message: MessageData = {
  id: 'review',
  role: 'assistant',
  state: 'complete',
  revision: 0,
  parts: [{ id: 'citation', type: 'source', ...reference }],
};

const cases: [string, Source[]][] = [
  ['changed version', [{ ...original, version: 'next', excerpt: 'Different version content.' }]],
  [
    'changed locator',
    [{ ...original, locator: 'Another section', excerpt: 'Different location content.' }],
  ],
  ['removed source', []],
  ['ambiguous source', [original, original]],
];

describe('citation resource lifecycle', () => {
  for (const variant of ['plain', 'bubble', 'panel'] as const) {
    it.each(cases)(`${variant} retains its open dialog and focus for %s`, async (_, sources) => {
      const user = userEvent.setup();
      const { rerender } = render(
        <Message variant={variant} value={message} sources={[original]} />,
      );
      const trigger = screen.getByRole('button', { name: /Source 1:/ });
      await user.click(trigger);
      const dialog = screen.getByRole('dialog');
      const close = within(dialog).getByRole('button', { name: 'Close panel' });
      expect(within(dialog).getByText(original.excerpt!)).toBeVisible();
      expect(within(dialog).getByRole('link', { name: /Open source/ })).toHaveAttribute(
        'href',
        original.url,
      );
      rerender(<Message variant={variant} value={message} sources={sources} />);
      expect(screen.getByRole('dialog')).toBe(dialog);
      expect(close).toHaveFocus();
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        'Source version or location unavailable.',
      );
      expect(within(dialog).queryByRole('link')).toBeNull();
      expect(within(dialog).queryByText(original.excerpt!)).toBeNull();
      expect(within(dialog).queryByText(/Different (version|location) content/)).toBeNull();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveAccessibleName('Source 1: Source unavailable');
      rerender(<Message variant={variant} value={message} sources={[original]} />);
      await user.click(trigger);
      expect(within(screen.getByRole('dialog')).getByText(original.excerpt!)).toBeVisible();
    });
  }
});
