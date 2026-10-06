import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccessModeSelector } from '@stackunseen/ui';
import { accessModes } from '../../../../../apps/docs/lib/coding-fixtures';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it.each(['cards', 'compact', 'select'] as const)(
    '%s access requests preserve confirmed permissions',
    async (variant) => {
      const user = userEvent.setup(),
        request = vi.fn();
      render(
        <AccessModeSelector
          variant={variant}
          modes={accessModes}
          value="read"
          scope="workspace"
          version="v4"
          status="ready"
          onRequest={request}
        />,
      );
      if (variant === 'select') {
        await user.click(screen.getByRole('combobox'));
        await user.click(screen.getByRole('option', { name: 'Workspace access' }));
      } else await user.click(screen.getByRole('radio', { name: /Workspace access/ }));
      await user.click(screen.getByRole('button', { name: 'Request access change' }));
      expect(request).toHaveBeenCalledWith({
        modeId: 'workspace',
        scope: 'workspace',
        version: 'v4',
      });
      expect(screen.getByText('Current: Read only')).toBeVisible();
    },
  );
});
