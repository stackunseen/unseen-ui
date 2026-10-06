import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageActions } from './message.js';
describe('additive message action availability', () => {
  it.each(['toolbar', 'compact', 'vertical'] as const)(
    '%s preserves copy while unavailable edit/retry explain the host guard',
    (variant) => {
      const edit = vi.fn(),
        retry = vi.fn();
      render(
        <MessageActions
          variant={variant}
          text="Answer"
          onEdit={edit}
          onRetry={retry}
          retryLabel="Regenerate"
          editAvailability={{ available: false, reason: 'Edit scope is stale.' }}
          retryAvailability={{ available: false, reason: 'Original response outcome is unknown.' }}
        />,
      );
      expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled();
      expect(screen.getByText('Edit scope is stale.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
      expect(edit).not.toHaveBeenCalled();
      expect(retry).not.toHaveBeenCalled();
    },
  );
});
