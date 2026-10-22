import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';

describe('Button variants', () => {
  it('marks the link variant for text-like actions such as a record name in a table', () => {
    render(
      <>
        <Button variant="link">Jordan Lee</Button>
        <Button variant="link" href="/customers/jordan">
          Open record
        </Button>
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

describe('Button styling hook', () => {
  it('always carries data-button, whatever data-part the caller sets, so containers can style it', () => {
    render(
      <>
        <Button>Plain</Button>
        <Button data-part="copy-button">Copy</Button>
        <Button href="/docs">Link</Button>
        <Button asChild>
          <span>Slotted</span>
        </Button>
      </>,
    );
    for (const name of ['Plain', 'Copy', 'Link', 'Slotted'])
      expect(screen.getByText(name).closest('[data-button]')).not.toBeNull();
    expect(screen.getByText('Copy').closest('[data-button]')).toHaveAttribute(
      'data-part',
      'copy-button',
    );
  });
});
