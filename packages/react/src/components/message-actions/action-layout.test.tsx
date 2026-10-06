import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MessageActions } from '@stackunseen/ui';

describe('compact contextual actions', () => {
  it('preserves keyboard callbacks and does not label feedback as acknowledged', async () => {
    const retry = vi.fn(),
      edit = vi.fn(),
      feedback = vi.fn();
    render(<MessageActions text="Response" onRetry={retry} onEdit={edit} onFeedback={feedback} />);
    const action = screen.getByRole('button', { name: 'Edit' });
    action.focus();
    await userEvent.keyboard('{Enter}');
    expect(edit).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }));
    expect(feedback).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Feedback requested.');
  });
});
