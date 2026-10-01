'use client';
import type { Grounding } from '@ai-interaction/core';
import { Panel } from '../panel/panel.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';

export function GroundingStatus({
  value,
  variant = 'bar',
}: VariantProps<'GroundingStatus'> & { value: Grounding }) {
  const coverage =
    value.kind === 'coverage' &&
    Number.isFinite(value.total) &&
    Number.isFinite(value.supported) &&
    value.total > 0 &&
    value.supported >= 0 &&
    value.supported <= value.total
      ? value.supported / value.total
      : undefined;
  return (
    <Panel className={s.grounding} data-variant={variant}>
      <strong>{value.kind === 'coverage' ? 'Source coverage' : 'Grounding'}</strong>
      {value.kind === 'unknown' ? (
        <p className={s.muted}>Not measured</p>
      ) : (
        <>
          {value.kind === 'qualitative' ? (
            <p>{value.label}</p>
          ) : coverage !== undefined ? (
            <>
              <div className={s.row}>
                <span>
                  {value.supported} of {value.total} claims linked
                </span>
                {variant !== 'ring' && <strong>{Math.round(coverage * 100)}%</strong>}
              </div>
              {variant === 'ring' ? (
                <div
                  className={s.ring}
                  role="progressbar"
                  aria-label="Claims with source links"
                  aria-valuemin={0}
                  aria-valuemax={value.total}
                  aria-valuenow={value.supported}
                >
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="24" cy="24" r="20" />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      pathLength="100"
                      strokeDasharray={`${coverage * 100} 100`}
                    />
                  </svg>
                  <span aria-hidden="true">{Math.round(coverage * 100)}%</span>
                </div>
              ) : (
                variant === 'bar' && (
                  <progress
                    className={s.progress}
                    value={value.supported}
                    max={value.total}
                    aria-label="Claims with source links"
                  />
                )
              )}
            </>
          ) : (
            <p>Coverage unavailable</p>
          )}
          <p className={s.muted}>{value.method}</p>
          <small className={s.muted}>Source links do not establish correctness.</small>
        </>
      )}
    </Panel>
  );
}
