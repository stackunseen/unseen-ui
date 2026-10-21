'use client';
import { useEffect, useState } from 'react';
import { validTimestamp } from '@stackunseen/ui-core';

const options = { dateStyle: 'medium', timeStyle: 'short' } as const;
const utcFormat = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' });

/** "Oct 1, 2026, 8:30 AM GMT+5:30" in the viewer's own time zone and locale. */
function localText(date: Date) {
  const zone =
    new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? '';
  return `${new Intl.DateTimeFormat(undefined, options).format(date)} ${zone}`.trim();
}

/**
 * A moment shown in the viewer's time zone. The server and the first browser render show UTC,
 * so both produce the same text; local time follows once the page is running, with UTC kept in
 * the tooltip.
 */
export function ObservationTime({ value }: { value?: string }) {
  const [local, setLocal] = useState<string>();
  useEffect(() => {
    setLocal(validTimestamp(value) ? localText(new Date(value!)) : undefined);
  }, [value]);
  if (!validTimestamp(value)) return <span>Time unavailable</span>;
  const utc = `${utcFormat.format(new Date(value))} UTC`;
  return (
    <time dateTime={value} title={local && local !== utc ? utc : undefined}>
      {local ?? utc}
    </time>
  );
}
