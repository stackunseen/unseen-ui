import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '@stackunseen/ui';

const branches = [
  { value: 'main', label: 'main' },
  { value: 'develop', label: 'develop' },
];

describe('Select in a form', () => {
  it('ignores the empty value the hidden native select reports', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <form>
        <Select aria-label="Branch" value="develop" onValueChange={onValueChange} options={branches} />
      </form>,
    );
    // In Chromium this happens when the value changes from code before its option exists.
    const native = container.querySelector('select')!;
    fireEvent.change(native, { target: { value: '' } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Branch' })).toHaveTextContent('develop');
  });
});
