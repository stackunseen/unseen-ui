import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AgentSteps, componentVariants } from '@stackunseen/ui';

describe('design audit interaction corrections', () => {
  it.each(componentVariants.AgentSteps)(
    '%s step details remain named without adding repeated region landmarks',
    async (variant) => {
      const user = userEvent.setup();
      render(
        <AgentSteps
          variant={variant}
          steps={[
            {
              id: 's',
              label: 'Read sources',
              state: 'running',
              dependencyIds: [],
              detail: 'Reading the handbook.',
            },
          ]}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Details' }));
      expect(screen.getByRole('group', { name: 'Details' })).toHaveTextContent(
        'Reading the handbook.',
      );
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    },
  );
});
