import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolGroup, componentVariants } from '@ai-interaction/react';

describe('design audit interaction corrections', () => {
  it.each(componentVariants.ToolGroup)('%s tool group explains the absence of calls', (variant) => {
    render(<ToolGroup tools={[]} variant={variant} />);
    expect(screen.getByText('No tool calls reported.')).toBeVisible();
    expect(screen.queryByText(/0 of 0/)).not.toBeInTheDocument();
  });
});
