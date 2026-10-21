'use client';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';

export interface ElapsedTimeProps extends Omit<ComponentProps<'time'>, 'children' | 'dateTime'> {
  /** When the work started (a Date, an ISO string or epoch milliseconds). */
  startedAt: Date | string | number;
  /** When it ended. Leave it out while the work is running and the time keeps counting. */
  endedAt?: Date | string | number;
  /**
   * Host-measured duration in milliseconds. Use it when the server reports elapsed time, so the
   * figure does not depend on the browser's clock.
   */
  durationMs?: number;
}

const toMs = (value: Date | string | number) =>
  value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);

/** "45s", "2m 05s", "1h 02m". Seconds below one round up to "1s" so a running timer never shows 0. */
export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const total = Math.max(1, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

function isoDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `PT${Math.floor(total / 3600)}H${Math.floor((total % 3600) / 60)}M${total % 60}S`;
}

/**
 * Time spent on a run or turn. While it runs it ticks once a second; once it ends it stops.
 * It is not a live region, so screen readers are not interrupted every second.
 */
export function ElapsedTime({ startedAt, endedAt, durationMs, ...props }: ElapsedTimeProps) {
  const start = toMs(startedAt);
  const end = endedAt === undefined ? undefined : toMs(endedAt);
  const running = end === undefined && durationMs === undefined;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const ms = durationMs ?? (end ?? now) - start;
  return (
    // The server and the browser read different clocks while running.
    <time
      {...props}
      dateTime={isoDuration(ms)}
      data-running={running || undefined}
      suppressHydrationWarning
    >
      {formatElapsed(ms)}
    </time>
  );
}
