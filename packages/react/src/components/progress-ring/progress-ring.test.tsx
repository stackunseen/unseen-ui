import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { Progress } from '../progress/progress.js';

afterEach(cleanup);

describe('Progress ring', () => {
  it('shares Progress semantics: labelled progressbar, bounded value, reading and complete state', () => {
    const { rerender } = render(
      <Progress variant="ring" label="Checklist" value={3} max={9} valueText="3 of 9" />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Checklist' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '9');
    expect(bar).toHaveAttribute('aria-valuetext', '3 of 9');
    expect(screen.getByText('3 of 9')).toHaveAttribute('aria-hidden', 'true');
    expect(bar.closest('[data-part="progress-ring"]')).toHaveAttribute('data-state', 'determinate');
    rerender(
      <Progress variant="ring" label="Checklist" value={12} max={9} labelVisibility="hidden" />,
    );
    expect(screen.getByRole('progressbar', { name: 'Checklist' })).toHaveAttribute(
      'aria-valuenow',
      '9',
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar').closest('[data-part="progress-ring"]')).toHaveAttribute(
      'data-state',
      'complete',
    );
  });

  it('stays indeterminate for unknown work and renders on the server', () => {
    render(<Progress variant="ring" label="Syncing" value={null} showReading={false} size="lg" />);
    const bar = screen.getByRole('progressbar', { name: 'Syncing' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar.closest('[data-part="progress-ring"]')).toHaveAttribute(
      'data-state',
      'indeterminate',
    );
    expect(screen.queryByText('In progress')).toBeNull();
    const html = renderToString(<Progress variant="ring" label="Upload" value={40} />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('40%');
  });
});
