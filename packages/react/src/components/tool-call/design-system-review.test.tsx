import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToolCall, componentVariants } from '@stackunseen/ui';
import type { ToolState } from '@stackunseen/ui-core';

describe('design audit interaction corrections', () => {
  const toolStates: [ToolState, string][] = [
    ['queued', 'Queued. The tool has not started.'],
    ['input-streaming', 'Receiving tool input. The tool has not started.'],
    ['approval-required', 'Waiting for approval. The tool has not started.'],
    ['succeeded', 'Tool completed without output.'],
    ['failed', 'The tool failed. No details were given.'],
    ['denied', 'Execution was denied.'],
    ['cancelled', 'Tool execution was cancelled.'],
    ['outcome-unknown', 'It’s not clear whether this tool ran. Check before trying again.'],
  ];

  it.each(componentVariants.ToolCall)(
    '%s tool distinguishes missing output across the lifecycle',
    async (variant) => {
      const user = userEvent.setup();
      const tool = { id: 'tool', name: 'read_document', revision: 1, input: '{}' };
      const { rerender } = render(
        <ToolCall variant={variant} value={{ ...tool, state: 'running' }} />,
      );
      if (variant === 'compact')
        await user.click(screen.getByRole('button', { name: 'Inspect execution' }));
      if (variant === 'row')
        await user.click(screen.getByRole('button', { name: /read_document/ }));
      expect(screen.getByRole('status')).toHaveTextContent('Waiting for the result');
      for (const [state, message] of toolStates) {
        rerender(<ToolCall variant={variant} value={{ ...tool, state }} />);
        expect(screen.getByText(message)).toBeInTheDocument();
        expect(screen.queryByText('Waiting for the result')).not.toBeInTheDocument();
      }
    },
  );

  it('keeps an unexplained compact tool failure visible before details are expanded', () => {
    render(
      <ToolCall
        variant="compact"
        value={{ id: 'failed', name: 'read', revision: 1, input: '{}', state: 'failed' }}
      />,
    );
    expect(screen.getByText('The tool failed. No details were given.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Inspect execution' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
