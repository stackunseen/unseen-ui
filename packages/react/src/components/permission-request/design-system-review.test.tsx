import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionRequest, componentVariants } from '@ai-interaction/react';

describe('design audit interaction corrections', () => {
  it.each(componentVariants.PermissionRequest)(
    '%s permission cannot allow an incomplete resource or scope',
    async (variant) => {
      const user = userEvent.setup(),
        onDecision = vi.fn();
      const props = {
        variant,
        resource: 'CRM',
        scopes: ['accounts:read'],
        status: 'requested' as const,
        onDecision,
      };
      const { rerender } = render(<PermissionRequest {...props} scopes={[]} />);
      expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Deny access' }));
      expect(onDecision).toHaveBeenCalledExactlyOnceWith(false);
      for (const override of [{ resource: ' ' }, { scopes: ['accounts:read', ' '] }]) {
        rerender(<PermissionRequest {...props} {...override} />);
        expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
      }
      rerender(<PermissionRequest {...props} />);
      await user.click(screen.getByRole('button', { name: 'Allow access' }));
      expect(onDecision).toHaveBeenLastCalledWith(true);
      for (const status of ['granted', 'denied', 'revoked'] as const) {
        rerender(<PermissionRequest {...props} status={status} />);
        expect(screen.getByRole('button', { name: 'Allow access' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Deny access' })).toBeDisabled();
      }
    },
  );
});
