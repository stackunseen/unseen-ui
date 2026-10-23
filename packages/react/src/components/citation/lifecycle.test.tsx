import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Citation } from '@stackunseen/ui';
import type { Source } from '@stackunseen/ui-core';
import { source } from '../../../../../apps/docs/lib/fixtures';

const original: Source = { ...source, url: 'https://example.com/original' };

const reference = { sourceId: source.id, version: source.version, locator: source.locator };

describe('citation resource lifecycle', () => {
  it('keeps keyboard focus inside the dialog when a focused source link is revoked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Citation source={original} number={1} />);
    const trigger = screen.getByRole('button', { name: /Source 1:/ });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog');
    const link = within(dialog).getByRole('link', { name: /Open source/ });
    link.focus();
    expect(link).toHaveFocus();
    rerender(<Citation source={{ ...original, access: 'revoked' }} number={1} />);
    expect(within(dialog).queryByRole('link')).toBeNull();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Source revoked');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it.each(['chip', 'inline', 'number'] as const)(
    '%s pins the opened identity until deliberately reopened',
    async (variant) => {
      const user = userEvent.setup();
      const { rerender } = render(<Citation variant={variant} source={original} number={1} />);
      const trigger = screen.getByRole('button', { name: /Source 1:/ });
      await user.click(trigger);
      const next = { ...original, version: 'next', excerpt: 'Updated content for a new review.' };
      rerender(<Citation variant={variant} source={next} number={1} />);
      expect(screen.getByRole('dialog')).toBeVisible();
      expect(screen.queryByText(next.excerpt)).toBeNull();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
      await user.click(trigger);
      expect(screen.getByText(next.excerpt)).toBeVisible();
    },
  );

  it('does not replace an open requested reference when the parent changes it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Citation reference={reference} source={original} number={1} />);
    const trigger = screen.getByRole('button', { name: /Source 1:/ });
    await user.click(trigger);
    const next = { ...original, id: 'another', version: '2', excerpt: 'Another source.' };
    rerender(
      <Citation
        reference={{ sourceId: next.id, version: next.version, locator: next.locator }}
        source={next}
        number={1}
      />,
    );
    expect(screen.queryByText(next.excerpt)).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('version or location isn’t available');
    await user.keyboard('{Escape}');
    await user.click(trigger);
    expect(screen.getByText(next.excerpt)).toBeVisible();
  });
});
