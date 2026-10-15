'use client';
import type { Measurement } from '@stackunseen/ui-core';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export interface RunParty {
  id: string;
  name: string;
}
export interface Money {
  amount: number;
  currency: string;
}

/** Stable UTC time text so server and client render the same string. */
export function formatTime(value: string | undefined, locale = 'en-US', timeZone = 'UTC') {
  if (!value) return undefined;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return undefined;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(time);
}
export function formatMoney(value: Money, locale = 'en-US') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: value.currency }).format(
      value.amount,
    );
  } catch {
    return `${value.amount} ${value.currency}`;
  }
}
export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  return `${(ms / 3_600_000).toFixed(1)} h`;
}

/** A measured, estimated or unknown value with its meaning visible and announced. */
export function MeasuredText<T>({
  measurement,
  format,
  unknownLabel = 'Unknown',
  className = '',
}: {
  measurement: Measurement<T> | undefined;
  format: (value: T) => string | undefined;
  unknownLabel?: string;
  className?: string;
}) {
  if (!measurement || measurement.kind === 'unknown')
    return (
      <span className={`${r.measure} ${className}`} data-meaning="unknown">
        {unknownLabel}
        {measurement?.kind === 'unknown' && measurement.reason ? ` (${measurement.reason})` : ''}
      </span>
    );
  const text = format(measurement.value) ?? unknownLabel;
  if (measurement.kind === 'estimated')
    return (
      <span className={`${r.measure} ${className}`} data-meaning="estimated">
        <abbr title={`Estimated from ${measurement.basis}`}>~</abbr>
        {text}
        <span className={s.srOnly}>, estimated from {measurement.basis}</span>
      </span>
    );
  return (
    <span className={`${r.measure} ${className}`} data-meaning="measured">
      {text}
    </span>
  );
}
