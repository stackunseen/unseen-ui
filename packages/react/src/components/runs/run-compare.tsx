'use client';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import type { CommandReceipt } from '@stackunseen/ui-core';
import { ExecutionTimeline } from '../execution-timeline/execution-timeline.js';
import type { TimelineEntry } from '../execution-timeline/execution-timeline.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { VariantProps } from '../../shared/variants.js';
import { MeasuredText, formatDuration, formatMoney } from './shared.js';
import type { RunSummary, RunEffect } from './run-summary-card.js';
import s from '../../shared/styles/styles.module.css';
import r from './runs.module.css';

export interface RunCompareSide {
  label: string;
  summary: RunSummary;
  timeline?: readonly TimelineEntry[];
  receipts?: readonly CommandReceipt[];
}
export interface RunCompareProps extends VariantProps<'RunCompare'> {
  left: RunCompareSide;
  right: RunCompareSide;
  /** Hide rows that are the same on both sides. Controlled when supplied. */
  onlyDifferences?: boolean;
  onOnlyDifferencesChange?: (value: boolean) => void;
  /** Optional host comparison of produced artifacts, for example an ArtifactDiff. */
  artifacts?: ReactNode;
  locale?: string;
  label?: string;
}

const outcomeLabels: Record<RunSummary['outcome'], string> = {
  succeeded: 'Succeeded',
  partial: 'Partly done',
  failed: 'Failed',
  cancelled: 'Cancelled',
  unknown: 'Outcome unknown',
};
const outcomeStates: Record<RunSummary['outcome'], string> = {
  succeeded: 'succeeded',
  partial: 'blocked',
  failed: 'failed',
  cancelled: 'cancelled',
  unknown: 'outcome-unknown',
};
function sameMeasurement(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
function effectKey(effect: RunEffect) {
  return `${effect.kind}:${effect.label}`;
}

/** Two runs or two checkpoints side by side: outcome, measurements, effects and timelines. */
export function RunCompare({
  variant = 'columns',
  left,
  right,
  onlyDifferences,
  onOnlyDifferencesChange,
  artifacts,
  locale,
  label = 'Compare runs',
}: RunCompareProps) {
  const id = useId();
  const [localOnly, setLocalOnly] = useState(false);
  const only = onlyDifferences ?? localOnly;
  const setOnly = (value: boolean) => {
    setLocalOnly(value);
    onOnlyDifferencesChange?.(value);
  };
  const confirmed = (side: RunCompareSide) =>
    new Set(
      (side.receipts ?? [])
        .filter((receipt) => receipt.status === 'acknowledged')
        .map((receipt) => receipt.commandId),
    );
  const confirmedLeft = confirmed(left);
  const confirmedRight = confirmed(right);
  const effectKeys = [
    ...new Set([...left.summary.effects, ...right.summary.effects].map(effectKey)),
  ];
  const effectRows = effectKeys
    .map((key) => {
      const a = left.summary.effects.find((effect) => effectKey(effect) === key);
      const b = right.summary.effects.find((effect) => effectKey(effect) === key);
      const stateOf = (effect: RunEffect | undefined, set: Set<string>) =>
        !effect
          ? 'absent'
          : effect.receiptId && set.has(effect.receiptId)
            ? 'confirmed'
            : 'unconfirmed';
      const la = stateOf(a, confirmedLeft);
      const lb = stateOf(b, confirmedRight);
      return {
        key,
        label: (a ?? b)!.label,
        kind: (a ?? b)!.kind,
        left: la,
        right: lb,
        same: la === lb,
      };
    })
    .filter((row) => !only || !row.same);
  const rows: { name: string; left: ReactNode; right: ReactNode; same: boolean }[] = [
    {
      name: 'Goal',
      left: left.summary.goal,
      right: right.summary.goal,
      same: left.summary.goal === right.summary.goal,
    },
    {
      name: 'Outcome',
      left: (
        <StatusBadge
          state={outcomeStates[left.summary.outcome]}
          label={outcomeLabels[left.summary.outcome]}
        />
      ),
      right: (
        <StatusBadge
          state={outcomeStates[right.summary.outcome]}
          label={outcomeLabels[right.summary.outcome]}
        />
      ),
      same: left.summary.outcome === right.summary.outcome,
    },
    {
      name: 'Duration',
      left: <MeasuredText measurement={left.summary.duration} format={formatDuration} />,
      right: <MeasuredText measurement={right.summary.duration} format={formatDuration} />,
      same: sameMeasurement(left.summary.duration, right.summary.duration),
    },
    {
      name: 'Cost',
      left: (
        <MeasuredText
          measurement={left.summary.cost}
          format={(value) => formatMoney(value, locale)}
        />
      ),
      right: (
        <MeasuredText
          measurement={right.summary.cost}
          format={(value) => formatMoney(value, locale)}
        />
      ),
      same: sameMeasurement(left.summary.cost, right.summary.cost),
    },
    {
      name: 'Not done',
      left: left.summary.notDone?.length ? left.summary.notDone.join('; ') : 'Nothing listed',
      right: right.summary.notDone?.length ? right.summary.notDone.join('; ') : 'Nothing listed',
      same:
        JSON.stringify(left.summary.notDone ?? []) === JSON.stringify(right.summary.notDone ?? []),
    },
  ].filter((row) => !only || !row.same);
  const effectText: Record<string, string> = {
    absent: 'Not produced',
    confirmed: 'Confirmed',
    unconfirmed: 'Unconfirmed',
  };
  return (
    <section
      className={r.compare}
      data-part="run-compare"
      data-variant={variant}
      aria-labelledby={`${id}-title`}
    >
      <div className={r.boardHead}>
        <h2 id={`${id}-title`} className={r.boardTitle}>
          {label}
        </h2>
        <label className={r.toggle}>
          <input
            type="checkbox"
            checked={only}
            onChange={(event) => setOnly(event.target.checked)}
          />
          Only differences
        </label>
      </div>
      <table className={r.compareTable}>
        <caption className={s.srOnly}>
          {left.label} compared with {right.label}
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className={s.srOnly}>Field</span>
            </th>
            <th scope="col">{left.label}</th>
            <th scope="col">{right.label}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} data-same={row.same || undefined}>
              <th scope="row">{row.name}</th>
              <td>{row.left}</td>
              <td>{row.right}</td>
            </tr>
          ))}
          {effectRows.map((row) => (
            <tr key={row.key} data-same={row.same || undefined}>
              <th scope="row">
                <span className={r.effectKind}>{row.kind}</span> {row.label}
              </th>
              <td data-effect={row.left}>{effectText[row.left]}</td>
              <td data-effect={row.right}>{effectText[row.right]}</td>
            </tr>
          ))}
          {rows.length === 0 && effectRows.length === 0 && (
            <tr>
              <td colSpan={3} className={s.muted}>
                No differences in the compared fields.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {(left.timeline || right.timeline) && (
        <div className={r.compareTimelines}>
          {[left, right].map((side) => (
            <div key={side.label} className={r.compareSide}>
              <h3 className={r.subheading}>{side.label} timeline</h3>
              <ExecutionTimeline variant="compact" entries={[...(side.timeline ?? [])]} />
            </div>
          ))}
        </div>
      )}
      {artifacts && <div className={r.compareArtifacts}>{artifacts}</div>}
    </section>
  );
}
