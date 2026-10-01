import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToolCall } from '@ai-interaction/react';

describe('execution content and contextual actions', () => {
  it('multiple tool previews carry their tool identity and retain input disclosure', async () => {
    render(
      <ToolCall
        value={{
          id: 'search',
          name: 'Search documents',
          revision: 2,
          state: 'succeeded',
          input: 'Query input',
          output: 'Host result',
        }}
      />,
    );
    expect(screen.queryByRole('group', { name: 'Search documents input preview' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Input · revision 2' }));
    expect(screen.getByRole('group', { name: 'Search documents input preview' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('group', { name: 'Search documents output preview' })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it.each(['failed', 'outcome-unknown'] as const)(
    '%s compact execution keeps its required warning outside nested disclosure',
    async (state) => {
      render(
        <ToolCall
          variant="compact"
          value={{
            id: 'review',
            name: 'Review change',
            revision: 3,
            state,
            input: 'Current review input',
            output: 'Obsolete result',
            ...(state === 'failed' ? { error: 'Host reported failure' } : {}),
          }}
        />,
      );
      const warning =
        state === 'failed' ? screen.getByRole('alert') : screen.getByText(/The result is unknown/);
      expect(warning).toBeVisible();
      expect(screen.queryByText('Obsolete result')).toBeNull();
      const trigger = screen.getByRole('button', { name: 'Inspect execution' });
      await userEvent.click(trigger);
      expect(screen.getByRole('group', { name: 'Inspect execution' })).toHaveAttribute(
        'aria-labelledby',
        trigger.id,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Input · revision 3' }));
      expect(screen.getByRole('group', { name: 'Review change input preview' })).toHaveTextContent(
        'Current review input',
      );
      expect(screen.queryAllByRole('region')).toHaveLength(0);
      await userEvent.click(trigger);
      expect(warning).toBeVisible();
      expect(screen.queryByRole('group', { name: 'Review change input preview' })).toBeNull();
      expect(screen.queryByText('Obsolete result')).toBeNull();
    },
  );
});
