'use client';
import { useLocale } from '../../providers/locale/locale.js';
import type { ComponentProps } from 'react';
import type { Measurement } from '@stackunseen/ui-core';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { formatStamp, wholePercent } from './shared.js';

export interface ConfidenceNoteProps
  extends VariantProps<'ConfidenceNote'>, Omit<ComponentProps<'span'>, 'scope' | 'method'> {
  /** A host-supplied calibration in [0, 1]. Unknown or out-of-range renders nothing. */
  score: Measurement<number>;
  /** What the score is about, such as "of claims matched a source". */
  scope: string;
  /** How the host obtained it, such as "eval pass rate over 40 runs". */
  method: string;
  at?: string;
  locale?: string;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

/** A calibration with its scope, method and date, or nothing. Never a bare number. */
export function ConfidenceNote({
  score,
  scope,
  method,
  at,
  locale: localeProp,
  variant = 'note',
  className = '',
  ...rest
}: ConfidenceNoteProps) {
  const locale = useLocale(localeProp);
  if (score.kind === 'unknown') return null;
  const percent =
    Number.isFinite(score.value) && score.value >= 0 && score.value <= 1
      ? wholePercent(score.value)
      : undefined;
  if (percent === undefined || !scope.trim() || !method.trim()) return null;
  const stamp = at ?? score.at;
  const text = `${score.kind === 'estimated' ? 'About ' : ''}${percent}% ${scope.trim()} · ${method.trim()}${
    score.kind === 'estimated' ? ` (estimated from ${score.basis})` : ''
  }${stamp ? ` · ${formatStamp(stamp, locale)}` : ''}`;
  const Tag = (variant === 'inline' ? 'span' : 'p') as 'span';
  return (
    <Tag
      {...rest}
      className={`${s.muted} ${className}`}
      data-part="confidence-note"
      data-variant={variant}
      data-kind={score.kind}
    >
      Confidence: {text}
    </Tag>
  );
}
