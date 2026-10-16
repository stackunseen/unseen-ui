'use client';
import type { Measurement } from '@stackunseen/ui-core';
import { Progress } from '../progress/progress.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { formatStamp, wholePercent } from './shared.js';

export interface Usage {
  /** What has been used so far, in the meter's unit. */
  used: number;
  /** The host's limit in the same unit. Without one the meter never shows a percentage. */
  limit?: number;
}
export interface UsageMeterProps extends VariantProps<'UsageMeter'> {
  /** What is being measured, such as "Context" or "Cost". */
  label: string;
  value: Measurement<Usage>;
  unit?: 'tokens' | 'currency' | 'count';
  /** ISO 4217 code for the currency unit. */
  currency?: string;
  /** Fraction of the limit from which the meter reads as a warning. */
  warnAt?: number;
  locale?: string;
}

function amount(
  value: number,
  unit: UsageMeterProps['unit'],
  currency: string,
  locale: string,
  withUnit: boolean,
) {
  if (unit === 'currency') {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
    } catch {
      return `${value.toLocaleString(locale)} ${currency}`;
    }
  }
  const text = value.toLocaleString(locale);
  return withUnit && unit === 'tokens' ? `${text} tokens` : text;
}

/**
 * Cost or context usage with the meaning of the number beside it. A percentage appears only when
 * the host reported a limit; an unknown measurement says so instead of showing zero.
 */
export function UsageMeter({
  label,
  value,
  unit = 'tokens',
  currency = 'USD',
  warnAt = 0.8,
  locale = 'en-US',
  variant = 'inline',
}: UsageMeterProps) {
  const usage = value.kind === 'unknown' ? undefined : value.value;
  const used = usage && Number.isFinite(usage.used) && usage.used >= 0 ? usage.used : undefined;
  const limit =
    usage && usage.limit !== undefined && Number.isFinite(usage.limit) && usage.limit > 0
      ? usage.limit
      : undefined;
  const fraction = used !== undefined && limit !== undefined ? used / limit : undefined;
  const percent = wholePercent(fraction);
  const tone =
    fraction === undefined
      ? 'neutral'
      : fraction >= 1
        ? 'danger'
        : fraction >= warnAt
          ? 'warning'
          : 'neutral';
  const reading =
    used === undefined
      ? 'Not measured'
      : limit !== undefined
        ? `${amount(used, unit, currency, locale, false)} of ${amount(limit, unit, currency, locale, true)}`
        : `${amount(used, unit, currency, locale, true)} so far`;
  const qualifier =
    value.kind === 'measured'
      ? 'Measured'
      : value.kind === 'estimated'
        ? `Estimated from ${value.basis}`
        : value.reason
          ? `Not measured: ${value.reason}`
          : 'Not measured';
  const at = value.kind !== 'unknown' && value.at ? formatStamp(value.at, locale) : undefined;
  const limitNote = used !== undefined && limit === undefined ? 'Limit not reported' : undefined;
  const meta = [qualifier, limitNote, at].filter(Boolean).join(' · ');
  const common = {
    'data-part': 'usage-meter',
    'data-variant': variant,
    'data-tone': tone,
    'data-kind': value.kind,
  } as const;
  if (variant === 'badge')
    return (
      <span {...common} className={s.badge}>
        <span>
          {label} · {percent !== undefined ? `${percent}%` : reading}
          {value.kind === 'estimated' ? ' (estimated)' : ''}
          <span className={s.srOnly}>
            {' '}
            {percent !== undefined ? reading : ''} {meta}
          </span>
        </span>
      </span>
    );
  if (variant === 'inline')
    return (
      <span {...common} className={s.muted}>
        {label}: {reading}
        {percent !== undefined ? ` (${percent}%)` : ''} · {meta}
      </span>
    );
  return (
    <div {...common} className={s.stack}>
      <div className={s.row}>
        <strong>{label}</strong>
        <span className={s.muted}>
          {reading}
          {percent !== undefined ? ` (${percent}%)` : ''}
        </span>
      </div>
      {fraction !== undefined && (
        <Progress
          label={`${label} used`}
          labelVisibility="hidden"
          value={used}
          max={limit}
          valueText={`${reading} (${percent}%)`}
          showReading={false}
        />
      )}
      <p className={tone === 'danger' ? s.error : tone === 'warning' ? s.warning : s.muted}>
        {tone === 'danger'
          ? `At the limit. ${meta}`
          : tone === 'warning'
            ? `Approaching the limit. ${meta}`
            : meta}
      </p>
    </div>
  );
}
