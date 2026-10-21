import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElapsedTime, formatElapsed } from './elapsed-time.js';

afterEach(() => vi.useRealTimers());

describe('ElapsedTime', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatElapsed(200)).toBe('1s');
    expect(formatElapsed(45_000)).toBe('45s');
    expect(formatElapsed(125_000)).toBe('2m 05s');
    expect(formatElapsed(3_720_000)).toBe('1h 02m');
    expect(formatElapsed(Number.NaN)).toBe('—');
  });

  it('ticks while running and stops once ended', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:00:10Z'));
    const { rerender } = render(<ElapsedTime startedAt="2026-10-21T10:00:00Z" />);
    const time = screen.getByText('10s');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', 'PT0H0M10S');
    expect(time).toHaveAttribute('data-running', 'true');
    act(() => vi.advanceTimersByTime(5000));
    expect(time).toHaveTextContent('15s');
    rerender(<ElapsedTime startedAt="2026-10-21T10:00:00Z" endedAt="2026-10-21T10:01:05Z" />);
    expect(time).toHaveTextContent('1m 05s');
    expect(time).not.toHaveAttribute('data-running');
    act(() => vi.advanceTimersByTime(5000));
    expect(time).toHaveTextContent('1m 05s');
  });

  it('prefers a host-measured duration', () => {
    render(<ElapsedTime startedAt={0} durationMs={90_000} />);
    expect(screen.getByText('1m 30s')).toBeInTheDocument();
  });

  it('is not a live region', () => {
    render(<ElapsedTime startedAt={Date.now()} />);
    expect(screen.getByText(/s$/)).not.toHaveAttribute('aria-live');
  });
});
