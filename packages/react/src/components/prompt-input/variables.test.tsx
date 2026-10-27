import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PromptInput } from './prompt-input.js';

describe('PromptInput variables and limit', () => {
  it('inserts a variable token at the caret and marks it as in use', async () => {
    const onValueChange = vi.fn();
    const onInsertVariable = vi.fn();
    const { rerender } = render(
      <PromptInput
        value="Summarize"
        onValueChange={onValueChange}
        onSubmit={() => {}}
        variables={[{ id: 'selection', label: 'selection' }]}
        onInsertVariable={onInsertVariable}
      />,
    );
    const group = screen.getByRole('group', { name: 'Insert variable' });
    await userEvent.click(screen.getByRole('button', { name: 'selection' }));
    expect(onValueChange).toHaveBeenCalledWith('Summarize {{selection}}');
    expect(onInsertVariable).toHaveBeenCalledWith({ id: 'selection', label: 'selection' });
    rerender(
      <PromptInput
        value="Summarize {{selection}}"
        onValueChange={onValueChange}
        onSubmit={() => {}}
        variables={[{ id: 'selection', label: 'selection' }]}
      />,
    );
    expect(group).toBeVisible();
    expect(screen.getByRole('button', { name: 'selection (in the message)' })).toHaveAttribute(
      'data-in-use',
      'true',
    );
  });
  it('counts characters against the limit and blocks sending past it', () => {
    const onSubmit = vi.fn();
    render(
      <PromptInput
        value={'x'.repeat(12)}
        onValueChange={() => {}}
        onSubmit={onSubmit}
        limit={10}
      />,
    );
    expect(screen.getByText('12 / 10')).toHaveAttribute('data-over', 'true');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      'Message exceeds 10 characters. Shorten it before sending.',
    );
  });
  it('keeps the default hint readable with key caps', () => {
    render(<PromptInput value="" onValueChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Shift + Enter for a new line');
  });
});
