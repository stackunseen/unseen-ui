import { describe, expect, it } from 'vitest';
import {
  estimated,
  heartbeatState,
  measured,
  measurementValue,
  unknownMeasurement,
} from '@stackunseen/ui-core';

describe('measurements', () => {
  it('keeps the meaning beside the value and never fabricates one', () => {
    expect(measured(3, '2026-10-15T10:00:00Z')).toEqual({
      kind: 'measured',
      value: 3,
      at: '2026-10-15T10:00:00Z',
    });
    expect(estimated(0.42, 'token price list')).toEqual({
      kind: 'estimated',
      value: 0.42,
      basis: 'token price list',
    });
    expect(unknownMeasurement('host offline')).toEqual({ kind: 'unknown', reason: 'host offline' });
    expect(measurementValue(measured(3))).toBe(3);
    expect(measurementValue(unknownMeasurement())).toBeUndefined();
    expect(measurementValue(undefined)).toBeUndefined();
  });

  it('derives stale only from two host timestamps and a positive window', () => {
    const beat = '2026-10-15T10:00:00Z';
    expect(heartbeatState(beat, '2026-10-15T10:00:30Z', 60_000)).toBe('fresh');
    expect(heartbeatState(beat, '2026-10-15T10:02:00Z', 60_000)).toBe('stale');
    expect(heartbeatState(beat, Date.parse('2026-10-15T10:02:00Z'), 60_000)).toBe('stale');
    expect(heartbeatState(undefined, '2026-10-15T10:02:00Z', 60_000)).toBe('unknown');
    expect(heartbeatState(beat, undefined, 60_000)).toBe('unknown');
    expect(heartbeatState('not a date', '2026-10-15T10:02:00Z', 60_000)).toBe('unknown');
    expect(heartbeatState(beat, '2026-10-15T10:02:00Z', 0)).toBe('unknown');
    expect(heartbeatState(beat, '2026-10-15T10:02:00Z', Number.NaN)).toBe('unknown');
  });
});
