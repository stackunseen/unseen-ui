import { render, screen } from '@testing-library/react';

import { describe, expect, it } from 'vitest';

import { ContextInspector } from '@stackunseen/ui';
import { componentVariants } from '../../shared/variants.js';
import { contextInspection } from '../../../../../apps/docs/lib/inspection-fixtures';

describe('context measurement semantics', () => {
  it.each(componentVariants.ContextInspector)(
    '%s announces token units, estimate and stale state on the usage meter',
    (variant) => {
      const { rerender } = render(<ContextInspector variant={variant} value={contextInspection} />);
      const meter = screen.getByRole('progressbar', { name: 'Estimated context usage' });
      expect(meter).toHaveAttribute('aria-valuetext', '4,200 of 16,000 tokens (estimated)');
      rerender(
        <ContextInspector variant={variant} value={{ ...contextInspection, stale: true }} />,
      );
      expect(
        screen.getByRole('progressbar', { name: 'Last reported context usage' }),
      ).toHaveAttribute('aria-valuetext', '4,200 of 16,000 tokens (estimated, stale snapshot)');
    },
  );

  it.each(['', '2026-02-30T12:00:00Z'])(
    'keeps usage unknown when its observation time is invalid (%s)',
    (measuredAt) => {
      render(
        <ContextInspector
          value={{ ...contextInspection, usage: { ...contextInspection.usage!, measuredAt } }}
        />,
      );
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeVisible();
      expect(
        screen.getByText('Usage metadata is incomplete. Token usage cannot be verified.'),
      ).toBeVisible();
    },
  );

  it.each([NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1])(
    'does not invent a percentage for invalid token usage %s',
    (used) => {
      render(
        <ContextInspector
          value={{ ...contextInspection, usage: { ...contextInspection.usage!, used } }}
        />,
      );
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeVisible();
    },
  );

  it('keeps valid zero usage measurable and unknown limits out of percentages', () => {
    const { rerender } = render(
      <ContextInspector
        value={{
          ...contextInspection,
          usage: { ...contextInspection.usage!, used: 0, kind: 'measured' },
        }}
      />,
    );
    expect(screen.getByRole('progressbar', { name: 'Reported context usage' })).toHaveAttribute(
      'aria-valuetext',
      '0 of 16,000 tokens (reported)',
    );
    rerender(
      <ContextInspector
        value={{ ...contextInspection, usage: { ...contextInspection.usage!, used: 0, limit: 0 } }}
      />,
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('0 tokens')).toBeVisible();
  });
});
