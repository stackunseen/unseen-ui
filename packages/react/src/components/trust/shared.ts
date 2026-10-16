/** A host timestamp as readable text, in UTC so server and client agree; the raw value when unparseable. */
export function formatStamp(at: string, locale = 'en-US'): string {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return at;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

/** A fraction in [0, 1] as a whole percentage, or undefined when it is not a usable number. */
export function wholePercent(fraction: number | undefined): number | undefined {
  if (fraction === undefined || !Number.isFinite(fraction) || fraction < 0) return undefined;
  return Math.round(Math.min(1, fraction) * 100);
}
