import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiffStat } from './diff-stat.js';

describe('DiffStat', () => {
  it('shows signed counts and reads them in words', () => {
    const { container } = render(<DiffStat added={15} removed={1} files={2} />);
    expect(container).toHaveTextContent('+15');
    expect(container).toHaveTextContent('−1');
    expect(screen.getByText('2 files, 15 lines added, 1 removed')).toBeInTheDocument();
    // The visible figures are hidden from assistive technology so they are not read twice.
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('2 files+15−1');
  });

  it('draws five blocks in proportion and treats bad input as zero', () => {
    const { container, rerender } = render(<DiffStat added={8} removed={2} blocks />);
    const kinds = [...container.querySelectorAll('[data-kind]')].map((block) =>
      block.getAttribute('data-kind'),
    );
    expect(kinds).toEqual(['added', 'added', 'added', 'added', 'removed']);
    rerender(<DiffStat added={Number.NaN} removed={-3} blocks />);
    expect(screen.getByText('0 lines added, 0 removed')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-kind="neutral"]')).toHaveLength(5);
  });

  it('uses singular words for one', () => {
    render(<DiffStat added={1} removed={0} files={1} />);
    expect(screen.getByText('1 file, 1 line added, 0 removed')).toBeInTheDocument();
  });
});
