import { render, screen } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { MathFormula } from '@ai-interaction/react/math';

vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
);

describe('optional math and diagram boundaries', () => {
  it.each(['block', 'inline', 'scroll'] as const)(
    '%s formulas include MathML and no executable links',
    (variant) => {
      const { container, rerender } = render(
        <MathFormula variant={variant} formula={'\\frac{x^2}{2}'} />,
      );
      expect(container.querySelector('math')).not.toBeNull();
      rerender(<MathFormula formula={'\\href{javascript:alert(1)}{click}'} />);
      expect(container.querySelector('a')).toBeNull();
    },
  );
  it('bounds large formulas and reports invalid syntax', () => {
    const { rerender } = render(<MathFormula formula="\\frac{" />);
    expect(screen.getByRole('status')).toHaveTextContent('Unable');
    rerender(<MathFormula formula={'x'.repeat(10001)} />);
    expect(screen.getByRole('status')).toHaveTextContent('limit');
  });
  it.each(['block', 'inline', 'scroll'] as const)(
    '%s keeps rejected source inert, bounded and separately inspectable',
    (variant) => {
      const formula = '<script>alert(1)</script>'.repeat(1000);
      const { container } = render(<MathFormula formula={formula} variant={variant} />);
      expect(screen.getByRole('status')).toHaveTextContent('Formula exceeds');
      expect(screen.getByRole('status').textContent).not.toContain('<script>');
      expect(screen.getByRole('group', { name: 'Formula source' })).toHaveAttribute(
        'tabindex',
        '0',
      );
      expect(screen.getByRole('group', { name: 'Formula source' }).textContent).toHaveLength(2000);
      expect(screen.getByText('Source preview limited to 2,000 characters.')).toBeVisible();
      expect(container.querySelector('script')).toBeNull();
    },
  );
});
