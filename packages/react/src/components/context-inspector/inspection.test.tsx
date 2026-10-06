import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ContextInspector, componentVariants } from '@stackunseen/ui';

import { contextInspection } from '../../../../../apps/docs/lib/inspection-fixtures';

describe('context inspection', () => {
  it.each(componentVariants.ContextInspector)(
    '%s distinguishes selection, inclusion, revocation and truncation',
    async (variant) => {
      const item = { ...contextInspection.items[0]!, selected: false, access: 'revoked' as const };
      render(
        <ContextInspector
          variant={variant}
          value={{ ...contextInspection, items: [item], usage: undefined }}
        />,
      );
      expect(screen.getByText('Inclusion unverified')).toBeVisible();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      if (variant === 'accordion')
        await userEvent.click(screen.getByRole('button', { name: /Operations handbook/ }));
      expect(screen.getByText(/Truncated/)).toBeVisible();
      expect(screen.getByText(/Not selected/)).toBeVisible();
      expect(screen.getByText(/Access revoked/)).toBeVisible();
    },
  );
  it('reports over-budget context without a fake capped percentage', () => {
    render(
      <ContextInspector
        value={{ ...contextInspection, usage: { ...contextInspection.usage!, used: 18000 } }}
      />,
    );
    expect(screen.getByText('Reported context usage exceeds the supplied limit.')).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
