import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceControl } from '@stackunseen/ui';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe('coding and workflow contracts', () => {
  it('voice calls the host without inventing recording state', async () => {
    const start = vi.fn();
    const { rerender } = render(<VoiceControl state="idle" onStart={start} onStop={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    expect(start).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Ready for voice');
    rerender(<VoiceControl state="denied" onStart={start} onStop={() => {}} />);
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeDisabled();
  });
});
