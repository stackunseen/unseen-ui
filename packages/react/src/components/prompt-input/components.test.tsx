import { fireEvent, render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { PromptInput } from '@stackunseen/ui';

describe('controlled interactions', () => {
  it('submits on Enter, preserves multiline/IME input and blocks whitespace', () => {
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <PromptInput value="Hello" onValueChange={onValueChange} onSubmit={onSubmit} />,
    );
    const input = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Hello');
    rerender(<PromptInput value="   " onValueChange={onValueChange} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });
});
