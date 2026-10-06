import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToolGroup } from '@stackunseen/ui';

describe('execution content and contextual actions', () => {
  it.each(['stack', 'grid', 'accordion'] as const)(
    '%s repeated tools use labelled groups without multiplying region landmarks',
    async (variant) => {
      const tools = [
        Object.freeze({
          id: 'search',
          name: 'Search documents',
          revision: 2,
          state: 'succeeded' as const,
          input: 'Query input',
          output: 'Host search result',
        }),
        Object.freeze({
          id: 'compare',
          name: 'Compare records',
          revision: 2,
          state: 'running' as const,
          input: 'Compare input',
          output: 'Current host result',
        }),
      ];
      render(<ToolGroup tools={tools} variant={variant} />);
      expect(screen.getByText('1 of 2 tools complete')).toBeVisible();
      if (variant === 'accordion') {
        for (const name of ['Search documents Complete', 'Compare records Running']) {
          const trigger = screen.getByRole('button', { name });
          expect(trigger).toHaveAttribute('aria-expanded', 'false');
          await userEvent.click(trigger);
          const content = document.getElementById(trigger.getAttribute('aria-controls')!);
          expect(content).toHaveAttribute('role', 'group');
          expect(content).toHaveAttribute('aria-labelledby', trigger.id);
          expect(content).toHaveAccessibleName(name);
          expect(trigger).toHaveAttribute('aria-expanded', 'true');
        }
      }
      expect(screen.getAllByText('Search documents')).toHaveLength(1);
      expect(screen.getAllByText('Compare records')).toHaveLength(1);
      expect(screen.getAllByText('Complete', { exact: true })).toHaveLength(1);
      expect(screen.getAllByText('Running', { exact: true })).toHaveLength(1);
      const inputs = screen.getAllByRole('button', { name: 'Input · revision 2' });
      expect(inputs).toHaveLength(2);
      for (const trigger of inputs) {
        await userEvent.click(trigger);
        const content = document.getElementById(trigger.getAttribute('aria-controls')!);
        expect(content).toHaveAttribute('role', 'group');
        expect(content).toHaveAttribute('aria-labelledby', trigger.id);
        expect(content).toHaveAccessibleName('Input · revision 2');
      }
      expect(inputs[0]!.getAttribute('aria-controls')).not.toBe(
        inputs[1]!.getAttribute('aria-controls'),
      );
      for (const tool of tools) {
        expect(screen.getByRole('group', { name: `${tool.name} input preview` })).toHaveTextContent(
          tool.input,
        );
        expect(
          screen.getByRole('group', { name: `${tool.name} output preview` }),
        ).toHaveTextContent(tool.output);
      }
      expect(screen.queryAllByRole('region')).toHaveLength(0);
      expect(screen.getByText('1 of 2 tools complete')).toBeVisible();
    },
  );
});
