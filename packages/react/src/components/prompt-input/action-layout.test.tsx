import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button, PromptInput } from '@stackunseen/ui';

describe('compact contextual actions', () => {
  it.each(['standard', 'compact', 'inline'] as const)(
    '%s composer tools remain local actions while Send submits the controlled draft',
    async (variant) => {
      const tools = vi.fn(),
        send = vi.fn();
      render(
        <PromptInput
          variant={variant}
          value="Review the change"
          onValueChange={() => {}}
          onSubmit={send}
          toolbar={
            <Button size="sm" variant="ghost" onClick={tools}>
              Choose a command
            </Button>
          }
        />,
      );
      const input = screen.getByRole('textbox', { name: 'Message' });
      expect(input).toHaveAccessibleDescription('Shift + Enter for a new line');
      const tool = screen.getByRole('button', { name: 'Choose a command' });
      tool.focus();
      await userEvent.keyboard('{Enter}');
      expect(tools).toHaveBeenCalledOnce();
      expect(send).not.toHaveBeenCalled();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'Send message' })).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      expect(send).toHaveBeenCalledWith('Review the change');
    },
  );
});
