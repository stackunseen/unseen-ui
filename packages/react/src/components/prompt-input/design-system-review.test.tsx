import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptInput, componentVariants } from '@ai-interaction/react';

describe('design audit interaction corrections', () => {
  it.each(componentVariants.PromptInput)(
    '%s composer exposes the current blocking reason without losing its draft',
    (variant) => {
      const props = { variant, value: 'Keep my draft', onValueChange: vi.fn(), onSubmit: vi.fn() };
      const { rerender } = render(
        <PromptInput {...props} disabled disabledReason="Connect a host to send messages." />,
      );
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
        'Connect a host to send messages.',
      );
      expect(screen.getByText('Connect a host to send messages.').className).not.toContain(
        'srOnly',
      );
      expect(screen.getByRole('textbox')).toHaveValue('Keep my draft');
      rerender(
        <PromptInput {...props} submitDisabled submitDisabledReason="Wait for the file upload." />,
      );
      expect(screen.getByText('Wait for the file upload.').className).not.toContain('srOnly');
      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
      rerender(<PromptInput {...props} disabledReason="An obsolete reason" />);
      expect(screen.queryByText('An obsolete reason')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
      rerender(<PromptInput {...props} value={'x'.repeat(20_001)} />);
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
        'Message exceeds 20,000 characters. Shorten it before sending.',
      );
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(props.onSubmit).not.toHaveBeenCalled();
    },
  );
});
