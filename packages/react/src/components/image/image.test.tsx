import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Image } from './image.js';

describe('Image generation states', () => {
  it('shows queued, then measured progress with a softened partial', () => {
    const { rerender, container } = render(<Image alt="A lighthouse" state="queued" />);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting to start…');
    expect(container.querySelector('figure')).toHaveAttribute('aria-busy', 'true');
    rerender(
      <Image
        alt="A lighthouse"
        state="loading"
        progress={0.4}
        preview="https://example.com/partial.png"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Generating image… 40%');
    expect(screen.getByRole('progressbar', { name: 'Image generation' })).toHaveAttribute(
      'value',
      '0.4',
    );
    // The partial is decorative; the finished image carries the description.
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    rerender(<Image alt="A lighthouse" src="https://example.com/final.png" />);
    expect(screen.getByRole('img', { name: 'A lighthouse' })).toBeInTheDocument();
    expect(container.querySelector('figure')).not.toHaveAttribute('aria-busy');
  });

  it('does not invent progress it was not given', () => {
    render(<Image alt="x" state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent(/^Generating image…$/);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('reports failure and offers a retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<Image alt="x" state="failed" error="The prompt was declined." onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The prompt was declined.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('ignores an unsafe preview', () => {
    const { container } = render(<Image alt="x" state="loading" preview="javascript:alert(1)" />);
    expect(container.querySelector('img')).toBeNull();
  });
});
