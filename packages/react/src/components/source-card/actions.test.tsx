import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Source } from '@stackunseen/ui-core';
import { SourceCard } from './source-card.js';

const first: Source = {
  id: 'report',
  title: 'Annual report',
  kind: 'document',
  version: '2025',
  locator: 'Page 18',
  access: 'available',
  url: 'https://example.com/report.pdf',
  excerpt: 'Published annual revenue.',
};

const second: Source = { ...first, id: 'policy', title: 'Pricing policy', locator: 'Section 4.2' };

describe('source-specific contextual action names', () => {
  it.each(['card', 'row', 'compact'] as const)(
    '%s identifies each callback action while preserving original source identity and precedence',
    async (variant) => {
      const open = vi.fn();
      render(
        <>
          <SourceCard variant={variant} source={first} onOpen={open} />
          <SourceCard variant={variant} source={second} onOpen={open} />
        </>,
      );
      const firstAction = screen.getByRole('button', { name: 'View source: Annual report' });
      const secondAction = screen.getByRole('button', { name: 'View source: Pricing policy' });
      expect(firstAction).toHaveTextContent('View source');
      expect(secondAction).toHaveTextContent('View source');
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      await userEvent.click(firstAction);
      expect(open).toHaveBeenLastCalledWith(first);
      secondAction.focus();
      await userEvent.keyboard('{Enter}');
      expect(open).toHaveBeenLastCalledWith(second);
      expect(open).toHaveBeenCalledTimes(2);
    },
  );

  it.each(['card', 'row', 'compact'] as const)(
    '%s identifies external links and announces their new-tab behavior without changing safe URLs',
    (variant) => {
      render(
        <>
          <SourceCard variant={variant} source={first} />
          <SourceCard variant={variant} source={second} />
        </>,
      );
      const link = screen.getByRole('link', {
        name: 'Open source: Annual report (opens in a new tab)',
      });
      expect(link).toHaveTextContent('Open source');
      expect(link).toHaveAttribute('href', first.url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(
        screen.getByRole('link', { name: 'Open source: Pricing policy (opens in a new tab)' }),
      ).toBeVisible();
      expect(link.querySelector('[data-ai-icon="external"]')).not.toBeNull();
    },
  );

  it('does not make unsafe, missing or revoked source content actionable', () => {
    const open = vi.fn();
    render(
      <>
        <SourceCard source={{ ...first, url: 'javascript:alert(1)' }} />
        <SourceCard source={{ ...second, access: 'missing' }} onOpen={open} />
        <SourceCard source={{ ...second, id: 'revoked', access: 'revoked' }} onOpen={open} />
      </>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('No source URL supplied.')).toBeVisible();
    expect(screen.getByText('Source missing. Content unavailable.')).toBeVisible();
    expect(screen.getByText('Source revoked. Content unavailable.')).toBeVisible();
    expect(open).not.toHaveBeenCalled();
  });
});
