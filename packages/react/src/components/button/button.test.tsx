import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';
import { LinkButton } from '../link-button/link-button.js';

describe('Button variants', () => {
  it('marks the link variant for text-like actions such as a record name in a table', () => {
    render(
      <>
        <Button variant="link">Jordan Lee</Button>
        <LinkButton variant="link" href="/customers/jordan">
          Open record
        </LinkButton>
      </>,
    );
    const button = screen.getByRole('button', { name: 'Jordan Lee' });
    expect(button).toHaveAttribute('data-variant', 'link');
    expect(button).toHaveAttribute('type', 'button');
    expect(screen.getByRole('link', { name: 'Open record' })).toHaveAttribute(
      'data-variant',
      'link',
    );
  });
});
