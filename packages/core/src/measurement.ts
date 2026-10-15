import type { SubmissionState } from './types.js';

/**
 * A number or value a host reports together with how it was obtained.
 * The interface shows the meaning next to the value and never invents one.
 */
export type Measurement<T> =
  | { kind: 'measured'; value: T; at?: string }
  | { kind: 'estimated'; value: T; basis: string; at?: string }
  | { kind: 'unknown'; reason?: string };

export function measured<T>(value: T, at?: string): Measurement<T> {
  return at ? { kind: 'measured', value, at } : { kind: 'measured', value };
}
export function estimated<T>(value: T, basis: string, at?: string): Measurement<T> {
  return at ? { kind: 'estimated', value, basis, at } : { kind: 'estimated', value, basis };
}
export function unknownMeasurement<T = never>(reason?: string): Measurement<T> {
  return reason ? { kind: 'unknown', reason } : { kind: 'unknown' };
}
/** The value when one exists, otherwise undefined; use when a layout needs a number or nothing. */
export function measurementValue<T>(measurement: Measurement<T> | undefined): T | undefined {
  return measurement && measurement.kind !== 'unknown' ? measurement.value : undefined;
}

/** The host's acknowledgement of one request. Pending is not success; unknown is not failure. */
export interface CommandReceipt {
  commandId: string;
  status: SubmissionState;
  at?: string;
  message?: string;
}

export type HeartbeatState = 'fresh' | 'stale' | 'unknown';
/**
 * Whether a host heartbeat is recent. Both timestamps come from the host; `unknown` covers a
 * missing or unparseable value so a stale run is never guessed from the absence of data.
 */
export function heartbeatState(
  heartbeatAt: string | undefined,
  now: string | number | undefined,
  staleAfterMs: number,
): HeartbeatState {
  if (!heartbeatAt || now === undefined || !(Number.isFinite(staleAfterMs) && staleAfterMs > 0))
    return 'unknown';
  const beat = Date.parse(heartbeatAt);
  const current = typeof now === 'number' ? now : Date.parse(now);
  if (!Number.isFinite(beat) || !Number.isFinite(current)) return 'unknown';
  return current - beat > staleAfterMs ? 'stale' : 'fresh';
}
