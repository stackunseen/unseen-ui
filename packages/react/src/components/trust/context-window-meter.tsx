'use client';
import type { ComponentProps } from 'react';
import { useLocale } from '../../providers/locale/locale.js';
import type { Measurement } from '@stackunseen/ui-core';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './trust.module.css';
import { formatStamp, wholePercent } from './shared.js';

export interface ContextSegment {
  id: string;
  /** What fills this part of the window, such as "System prompt" or "Tool results". */
  label: string;
  tokens: number;
}
export interface ContextWindow {
  segments: readonly ContextSegment[];
  /** The model's window in tokens. Without it the meter shows amounts, never a percentage. */
  limit?: number;
}
export interface ContextWindowMeterProps
  extends VariantProps<'ContextWindowMeter'>, ComponentProps<'div'> {
  value: Measurement<ContextWindow>;
  /** Fraction of the limit from which the meter reads as a warning. */
  warnAt?: number;
  label?: string;
  locale?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

/**
 * How full the model's context window is and what fills it, from numbers the host supplies.
 * Segments draw to scale against the limit; an estimated window says so, and an unknown one
 * shows the reason instead of an empty bar.
 */
export function ContextWindowMeter({
  variant = 'bar',
  value,
  warnAt = 0.8,
  label = 'Context window',
  locale: localeProp,
  className = '',
  ...rest
}: ContextWindowMeterProps) {
  const locale = useLocale(localeProp);
  const window = value.kind === 'unknown' ? undefined : value.value;
  const segments = (window?.segments ?? []).filter(
    (segment) => Number.isFinite(segment.tokens) && segment.tokens >= 0,
  );
  const used = segments.reduce((sum, segment) => sum + segment.tokens, 0);
  const limit =
    window?.limit !== undefined && Number.isFinite(window.limit) && window.limit > 0
      ? window.limit
      : undefined;
  const fraction = limit !== undefined ? used / limit : undefined;
  const percent = wholePercent(fraction);
  const tone =
    fraction === undefined
      ? 'neutral'
      : fraction >= 1
        ? 'danger'
        : fraction >= warnAt
          ? 'warning'
          : 'neutral';
  const tokens = (count: number) => `${count.toLocaleString(locale)} tokens`;
  const reading =
    window === undefined
      ? 'Not measured'
      : limit !== undefined
        ? `${used.toLocaleString(locale)} of ${tokens(limit)}${percent !== undefined ? ` (${percent}%)` : ''}`
        : `${tokens(used)}, limit not reported`;
  const qualifier =
    value.kind === 'measured'
      ? 'Measured'
      : value.kind === 'estimated'
        ? `Estimated from ${value.basis}`
        : value.reason
          ? `Not measured: ${value.reason}`
          : 'Not measured';
  const at = value.kind !== 'unknown' && value.at ? formatStamp(value.at, locale) : undefined;
  const meta = [qualifier, at].filter(Boolean).join(' · ');
  const common = {
    'data-part': 'context-window-meter',
    'data-variant': variant,
    'data-tone': tone,
    'data-kind': value.kind,
  } as const;
  if (variant === 'inline')
    return (
      <span {...(rest as ComponentProps<'span'>)} {...common} className={`${s.muted} ${className}`}>
        {label}: {reading} · {meta}
      </span>
    );
  const scale = limit ?? (used > 0 ? used : 1);
  return (
    <div
      {...rest}
      {...common}
      className={`${own.stack} ${className}`}
      role="group"
      aria-label={label}
    >
      <div className={s.row}>
        <strong>{label}</strong>
        <span className={s.muted}>{reading}</span>
      </div>
      {window !== undefined && (
        <div
          className={own.windowBar}
          role="img"
          aria-label={`${reading}. ${segments.map((segment) => `${segment.label} ${tokens(segment.tokens)}`).join(', ')}`}
        >
          {segments.map((segment) => (
            <span
              key={segment.id}
              className={own.windowSegment}
              style={{ flexBasis: `${(segment.tokens / scale) * 100}%` }}
              title={`${segment.label}: ${tokens(segment.tokens)}`}
            />
          ))}
        </div>
      )}
      {variant === 'detail' && segments.length > 0 && (
        <dl className={own.windowSegments}>
          {segments.map((segment) => (
            <div key={segment.id}>
              <dt>{segment.label}</dt>
              <dd>
                {segment.tokens.toLocaleString(locale)}
                {limit !== undefined && ` (${wholePercent(segment.tokens / limit) ?? 0}%)`}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className={s.muted}>{meta}</p>
    </div>
  );
}
