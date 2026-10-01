import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PolicyStatus, componentVariants } from '@ai-interaction/react';

import { policyChecks } from '../../../../../apps/docs/lib/inspection-fixtures';

describe('policy provenance', () => {
  it.each(componentVariants.PolicyStatus)(
    '%s keeps unverified passes neutral and exposes provenance',
    async (variant) => {
      const user = userEvent.setup();
      const check = { ...policyChecks[0]!, attestation: undefined };
      const { rerender } = render(<PolicyStatus variant={variant} checks={[check]} />);
      expect(screen.getByText('Not verified')).toBeVisible();
      expect(screen.queryByText('All reported checks passed')).not.toBeInTheDocument();
      if (variant === 'accordion')
        await user.click(screen.getByRole('button', { name: /Retention policy/ }));
      expect(screen.getByText('No verifiable attestation was supplied.')).toBeVisible();
      rerender(
        <PolicyStatus variant={variant} checks={[{ ...policyChecks[0]!, freshness: 'stale' }]} />,
      );
      expect(screen.getByText('Stale')).toBeVisible();
      expect(screen.getByText('Synthetic policy authority')).toBeVisible();
      expect(screen.queryByText('All reported checks passed')).not.toBeInTheDocument();
    },
  );
});
