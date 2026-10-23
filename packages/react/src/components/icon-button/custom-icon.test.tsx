import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconButton } from '../../index.js';

function Star(props: React.SVGProps<SVGSVGElement>) {
  return <svg data-testid="star" {...props} />;
}

describe('IconButton with a host icon', () => {
  it('renders the component at the icon size, hidden from assistive technology', () => {
    render(<IconButton icon={Star} label="Favourite" />);
    const button = screen.getByRole('button', { name: 'Favourite' });
    const svg = screen.getByTestId('star');
    expect(button.contains(svg)).toBe(true);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('15');
  });
});
