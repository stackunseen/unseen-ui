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

describe('SME component review regressions', () => {
  it.each(['cards', 'compact', 'select'] as const)(
    '%s access drafts cannot silently migrate to a different scope or policy',
    async (variant) => {
      const user = userEvent.setup();
      const request = vi.fn();
      const props = {
        variant,
        modes: accessModes,
        value: 'read',
        scope: 'repo-a',
        version: '1',
        status: 'ready' as const,
        onRequest: request,
      };
      const { rerender } = render(<AccessModeSelector {...props} />);
      async function choose() {
        if (variant === 'select') {
          await user.click(screen.getByRole('combobox'));
          await user.click(screen.getByRole('option', { name: 'Workspace access' }));
        } else await user.click(screen.getByRole('radio', { name: /Workspace access/ }));
      }
      await choose();
      rerender(<AccessModeSelector {...props} scope="repo-b" />);
      expect(screen.getByRole('status')).toHaveTextContent('Choose a mode again');
      expect(screen.getByRole('button', { name: 'Request access change' })).toBeDisabled();
      await choose();
      rerender(<AccessModeSelector {...props} scope="repo-b" version="2" />);
      expect(screen.getByRole('button', { name: 'Request access change' })).toBeDisabled();
      await choose();
      await user.click(screen.getByRole('button', { name: 'Request access change' }));
      expect(request).toHaveBeenCalledExactlyOnceWith({
        modeId: 'workspace',
        scope: 'repo-b',
        version: '2',
      });
    },
  );
});
