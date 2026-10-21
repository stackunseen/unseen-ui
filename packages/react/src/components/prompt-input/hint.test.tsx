import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PromptInput } from '@stackunseen/ui';

describe('PromptInput hint', () => {
  it('reads the new-line hint to screen readers without showing it', () => {
    render(<PromptInput value="" onValueChange={() => {}} onSubmit={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Message' });
    expect(input).toHaveAccessibleDescription('Shift + Enter for a new line');
    expect(document.querySelector('[data-hint]')?.className).toMatch(/srOnly/);
  });

  it('shows a hint the host passes', () => {
    render(
      <PromptInput
        value=""
        onValueChange={() => {}}
        onSubmit={() => {}}
        hint="Quiet hours until 07:00"
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAccessibleDescription(
      'Quiet hours until 07:00',
    );
    expect(document.querySelector('[data-hint]')?.className).not.toMatch(/srOnly/);
  });
});
