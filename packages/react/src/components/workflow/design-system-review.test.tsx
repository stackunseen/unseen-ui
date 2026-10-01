import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Workflow, componentVariants } from '@ai-interaction/react';

describe('design audit interaction corrections', () => {
  it.each(componentVariants.Workflow)('%s workflow explains an empty result', (variant) => {
    render(<Workflow steps={[]} variant={variant} />);
    expect(screen.getByRole('listitem')).toHaveTextContent('No workflow steps reported.');
  });
});
