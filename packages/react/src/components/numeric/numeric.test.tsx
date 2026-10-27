import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Numeric } from './numeric.js';

describe('Numeric', () => {
  it('prints the figure and its qualifier as text, with the tone only as data', () => {
    render(<Numeric size="lg" tone="up" value="+2.1 h" qualifier="vs September" />);
    const figure = screen.getByText('+2.1 h');
    expect(figure.parentElement).toHaveAttribute('data-part', 'numeric');
    expect(figure.parentElement).toHaveAttribute('data-size', 'lg');
    expect(figure.parentElement).toHaveAttribute('data-tone', 'up');
    expect(screen.getByText('vs September')).toBeVisible();
  });
  it('omits the tone attribute when neutral and the qualifier when absent', () => {
    render(<Numeric value="820 ms" />);
    const row = screen.getByText('820 ms').parentElement!;
    expect(row).not.toHaveAttribute('data-tone');
    expect(row.childElementCount).toBe(1);
  });
});
