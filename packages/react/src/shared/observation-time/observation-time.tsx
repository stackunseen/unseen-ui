'use client';
import { validTimestamp } from '@ai-interaction/core';

const observationFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export function ObservationTime({ value }: { value?: string }) {
  return validTimestamp(value) ? (
    <time dateTime={value}>{observationFormat.format(new Date(value))} UTC</time>
  ) : (
    <span>Time unavailable</span>
  );
}
