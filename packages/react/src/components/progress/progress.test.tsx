import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Progress } from './progress.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('native measured progress', () => {
  it('associates the visible label with the native meter and exposes meaningful measurement text', () => {
    const ref = createRef<HTMLProgressElement>();
    render(<Progress ref={ref} label="Upload" value={3} max={8} valueText="3 of 8 files" />);
    const progress = screen.getByRole('progressbar', { name: 'Upload' });
    expect(progress.tagName).toBe('PROGRESS');
    expect(progress).toHaveAttribute('value', '3');
    expect(progress).toHaveAttribute('max', '8');
    expect(progress).toHaveAttribute('aria-valuetext', '3 of 8 files');
    expect(screen.getByText('3 of 8 files')).toBeVisible();
    expect(ref.current).toBe(progress);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([null, undefined, NaN, Infinity, -Infinity])(
    'keeps an unknown value %s indeterminate',
    (value) => {
      render(<Progress label="Export" value={value} />);
      const progress = screen.getByRole('progressbar', { name: 'Export' });
      expect(progress).not.toHaveAttribute('value');
      expect(progress).not.toHaveAttribute('aria-valuenow');
      expect(progress).toHaveAttribute('data-state', 'indeterminate');
      expect(screen.getByText('In progress')).toBeVisible();
      expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    },
  );

  it.each([0, -1, NaN, Infinity])('does not invent a percentage from invalid maximum %s', (max) => {
    render(<Progress label="Export" value={10} max={max} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('value');
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });

  it.each([
    [-3, 0, '0%'],
    [0, 0, '0%'],
    [2, 2, '25%'],
    [12, 8, '100%'],
  ])('bounds measured %s to its declared range', (value, bounded, display) => {
    render(<Progress label="Export" value={value as number} max={8} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', String(bounded));
    expect(screen.getByText(String(display))).toBeVisible();
  });

  it('does not round incomplete work up to complete and handles determinate-to-unknown updates', () => {
    const { rerender } = render(<Progress label="Export" value={99.99} />);
    expect(screen.getByText('99%')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-state', 'determinate');
    rerender(<Progress label="Export" value={null} valueText="Waiting for a measurement" />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('value');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Waiting for a measurement',
    );
    expect(screen.queryByText('99%')).not.toBeInTheDocument();
  });
});

describe('Progress label visibility', () => {
  it('keeps a hidden label as the accessible name and can drop the visible reading', () => {
    const { rerender } = render(
      <Progress
        label="Series progress"
        value={3}
        max={8}
        valueText="3 of 8 published"
        labelVisibility="hidden"
      />,
    );
    const meter = screen.getByRole('progressbar', { name: 'Series progress' });
    expect(meter).toHaveAttribute('aria-valuetext', '3 of 8 published');
    expect(screen.getByText('Series progress')).toHaveClass(/srOnly/);
    expect(screen.getByText('3 of 8 published')).toBeVisible();
    rerender(
      <Progress
        label="Series progress"
        value={3}
        max={8}
        labelVisibility="hidden"
        showReading={false}
      />,
    );
    expect(screen.getByRole('progressbar', { name: 'Series progress' })).toBeInTheDocument();
    expect(screen.queryByText('37%')).not.toBeInTheDocument();
  });
});
