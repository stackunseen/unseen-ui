'use client';
import { useState } from 'react';
import { Button, Chart, resolveVariant } from '@ai-interaction/react';
import type { ChartSeries, ChartProps } from '@ai-interaction/react';
import styles from './form-specimen.module.css';

export function ChartSpecimen({
  state,
  presentation,
  onEvent,
}: {
  state: string;
  presentation?: string;
  onEvent: (message: string) => void;
}) {
  const [revoked, setRevoked] = useState(false);
  const initial =
    state === 'Hidden series'
      ? ['preview']
      : state === 'All hidden'
        ? ['main', 'preview', 'baseline']
        : [];
  const [hidden, setHidden] = useState<readonly string[]>(initial);
  const [requested, setRequested] = useState<readonly string[]>();
  const long = state === 'Long labels';
  const count = state === 'Many categories' ? 60 : 6;
  const categories = Array.from({ length: count }, (_, index) => ({
    id: `run-${index}`,
    label: long
      ? `Run ${index + 1}: deployment build and verification for the customer workspace`
      : `Run ${index + 1}`,
  }));
  const multi = ![
    'Default',
    'Empty',
    'Negative values',
    'Invalid data',
    'Scientific',
    'Currency',
  ].includes(state);
  const series: ChartSeries[] = ['main', 'preview', 'baseline'].map((id, group) => ({
    id,
    label: long
      ? `${id}: customer deployment verification branch`
      : id[0]!.toUpperCase() + id.slice(1),
    points: categories.map((category, index) => ({
      ...category,
      label:
        state === 'Invalid alignment' && group === 1 && index === 2
          ? 'Other category'
          : category.label,
      value:
        state === 'All missing' || (state === 'Missing values' && index === 2)
          ? null
          : [41, 18, 32, 24, 36, 22][index % 6]! + group * 8,
    })),
  }));
  const availability: ChartProps['state'] = revoked
    ? 'denied'
    : state === 'Loading'
      ? 'loading'
      : state === 'Denied'
        ? 'denied'
        : state === 'Unavailable'
          ? 'unavailable'
          : state === 'Error'
            ? 'error'
            : state === 'Streaming'
              ? 'streaming'
              : state === 'Stale'
                ? 'stale'
                : state === 'Unknown'
                  ? 'unknown'
                  : 'ready';
  const points =
    state === 'Empty'
      ? []
      : categories.map((category, index) => ({
          ...category,
          value:
            state === 'Invalid data' && index === 2
              ? NaN
              : state === 'Scientific'
                ? (index + 1) * 1e-200
                : state === 'Currency'
                  ? 1234.5 + index * 48.35
                  : state === 'Negative values' && index % 2
                    ? -18
                    : [41, 18, 32, 24, 36, 22][index % 6]!,
        }));
  return (
    <div className={styles.root}>
      <Chart
        title={
          long
            ? 'Build duration across the deployment review and verification stages'
            : state === 'Currency'
              ? 'Build cost'
              : 'Build duration'
        }
        unit={state === 'Currency' ? 'EUR' : 'seconds'}
        source="Synthetic CI history"
        asOf="Synthetic run snapshot"
        state={availability}
        error="CI history could not be loaded."
        variant={resolveVariant('Chart', presentation)}
        points={multi ? undefined : points}
        series={multi ? series : undefined}
        locale={state === 'Currency' ? 'de-DE' : 'en-US'}
        numberFormat={state === 'Currency' ? { style: 'currency', currency: 'EUR' } : undefined}
        hiddenSeries={state === 'Invalid selection' ? ['obsolete'] : multi ? hidden : undefined}
        onSeriesVisibilityChange={
          multi
            ? (next) => {
                if (state === 'Selection pending') setRequested(next);
                else setHidden(next);
                onEvent('Host received a chart series selection request.');
              }
            : undefined
        }
      />
      {requested && (
        <div className={styles.controls}>
          <p>Selection request awaiting synthetic host acknowledgement.</p>
          <Button
            onClick={() => {
              setHidden(requested);
              setRequested(undefined);
              onEvent('Synthetic host acknowledged the current selection.');
            }}
          >
            Acknowledge selection
          </Button>
        </div>
      )}
      <div className={styles.controls}>
        <Button
          variant="outline"
          onClick={() => {
            setRevoked((current) => !current);
            setRequested(undefined);
            onEvent(
              revoked ? 'Synthetic chart access restored.' : 'Synthetic chart access revoked.',
            );
          }}
        >
          {revoked ? 'Restore chart access' : 'Revoke chart access'}
        </Button>
      </div>
      <p>
        Synthetic measured values. Legend changes are host-controlled; Chart data retains every
        supplied value.
      </p>
    </div>
  );
}
