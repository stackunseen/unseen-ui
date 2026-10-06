import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClarificationRequest, componentVariants } from '@stackunseen/ui';

describe('design audit interaction corrections', () => {
  it.each(componentVariants.ClarificationRequest)(
    '%s clarification focuses and describes an invalid answer, preserving host state',
    async (variant) => {
      const user = userEvent.setup(),
        onSubmit = vi.fn();
      const props = {
        variant,
        question: 'Choose an environment',
        value: '',
        onValueChange: vi.fn(),
        onSubmit,
      };
      const { rerender } = render(
        <ClarificationRequest {...props} choices={[{ value: 'preview', label: 'Preview' }]} />,
      );
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByRole('radio')).toHaveFocus();
      expect(screen.getByRole('radio')).toHaveAccessibleDescription(
        'Choose an answer to continue.',
      );
      expect(screen.getByRole('radio')).toHaveAttribute('aria-invalid', 'true');
      expect(onSubmit).not.toHaveBeenCalled();
      rerender(
        <ClarificationRequest
          {...props}
          value="preview"
          choices={[{ value: 'preview', label: 'Preview' }]}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(onSubmit).toHaveBeenCalledExactlyOnceWith('preview');
      rerender(<ClarificationRequest {...props} />);
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByRole('textbox')).toHaveFocus();
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Please provide an answer.');
      rerender(
        <ClarificationRequest
          {...props}
          value="preview"
          error="Environment no longer available."
        />,
      );
      expect(screen.getByRole('textbox')).toHaveValue('preview');
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
        'Environment no longer available.',
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
      rerender(<ClarificationRequest {...props} value="preview" state="submitting" />);
      expect(screen.getByRole('textbox')).toBeDisabled();
      fireEvent.submit(screen.getByRole('textbox').closest('form')!);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    },
  );
});
