'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { type ComponentProps, useState } from 'react';
import type { ContextInspection, InspectedContextItem } from '@stackunseen/ui-core';
import { validCount, validTimestamp } from '@stackunseen/ui-core';
import { Accordion } from '../accordion/accordion.js';
import { Select } from '../select/select.js';
import { Panel } from '../panel/panel.js';
import { IconButton } from '../icon-button/icon-button.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Skeleton } from '../skeleton/skeleton.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import context from './context-inspector.module.css';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';

function ContextState({ item, stale }: { item: InspectedContextItem; stale: boolean }) {
  const unverified = stale || item.access !== 'available';
  return (
    <StatusBadge
      state={
        unverified
          ? 'unknown'
          : item.inclusion === 'included'
            ? 'succeeded'
            : item.inclusion === 'pending'
              ? 'pending'
              : item.inclusion === 'excluded'
                ? 'blocked'
                : 'unknown'
      }
      label={
        unverified
          ? 'Inclusion unverified'
          : item.inclusion === 'included'
            ? 'Included'
            : item.inclusion === 'excluded'
              ? 'Excluded'
              : item.inclusion === 'pending'
                ? 'Pending'
                : 'Inclusion unknown'
      }
    />
  );
}

function TokenDetail({ item }: { item: InspectedContextItem }) {
  const locale = useLocale();
  return (
    <span>
      {validCount(item.includedTokens) ? item.includedTokens.toLocaleString(locale) : 'Unknown'}{' '}
      tokens
      {validCount(item.originalTokens)
        ? ` / ${item.originalTokens.toLocaleString(locale)} original`
        : ''}
      {item.truncated ? ' · Truncated' : ''}
    </span>
  );
}

export interface ContextInspectorProps
  extends VariantProps<'ContextInspector'>, ComponentProps<'section'> {
  value: ContextInspection;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

export function ContextInspector({
  value,
  variant = 'list',
  loading = false,
  error,
  onRefresh,
  className = '',
  ...rest
}: ContextInspectorProps) {
  const locale = useLocale();
  const [filter, setFilter] = useState('all');
  const shown = value.items.filter(
    (item) =>
      filter === 'all' || (filter === 'selected' ? item.selected : item.inclusion === filter),
  );
  const usage = value.usage;
  const usageVerified =
    usage &&
    !!value.source.trim() &&
    !!value.revision.trim() &&
    validTimestamp(value.observedAt) &&
    !!usage.model.trim() &&
    validTimestamp(usage.measuredAt);
  const count = usageVerified && validCount(usage.used);
  const limit = usage && validCount(usage.limit) && usage.limit > 0;
  const effectiveIncluded = value.items.filter(
    (item) => item.inclusion === 'included' && item.access === 'available',
  ).length;
  function details(item: InspectedContextItem) {
    return (
      <div className={context.contextDetails}>
        <p className={s.muted}>
          Version {item.version} · {item.selected ? 'Selected by user' : 'Not selected by user'}
        </p>
        <p>
          <TokenDetail item={item} />
        </p>
        {item.reason && <p className={s.muted}>{item.reason}</p>}
        {item.access !== 'available' && (
          <p className={s.warning}>Access {item.access}. Current inclusion cannot be verified.</p>
        )}
      </div>
    );
  }
  return (
    <Panel {...rest} className={`${s.contextInspector} ${className}`} data-variant={variant}>
      <div className={s.row}>
        <strong className={s.grow}>Context inspection</strong>
        {onRefresh && (
          <IconButton icon="retry" label="Refresh context" onClick={onRefresh} disabled={loading} />
        )}
      </div>
      <p className={s.muted}>
        Selected sources and the material actually sent to the model can differ.
      </p>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {value.stale && (
        <p className={s.warning}>
          This context snapshot is stale. Inclusion and usage may have changed.
        </p>
      )}
      {loading ? (
        <Skeleton shape="card" label="Loading context inspection" />
      ) : (
        <>
          <div className={s.metricGrid}>
            <div>
              <span className={s.muted}>Selected sources</span>
              <strong>{value.items.filter((item) => item.selected).length}</strong>
            </div>
            <div>
              <span className={s.muted}>
                {value.stale ? 'Last reported included' : 'Reported accessible inclusions'}
              </span>
              <strong>{effectiveIncluded}</strong>
            </div>
            <div>
              <span className={s.muted}>
                {usage?.kind === 'estimated' ? 'Estimated usage' : 'Reported usage'}
              </span>
              <strong>
                {count
                  ? `${usage.used.toLocaleString(locale)}${limit ? ` / ${usage.limit!.toLocaleString(locale)}` : ''} tokens`
                  : 'Unknown'}
              </strong>
            </div>
          </div>
          {count &&
            limit &&
            (usage.used <= usage.limit! ? (
              <progress
                className={s.progress}
                value={usage.used}
                max={usage.limit}
                aria-label={
                  value.stale
                    ? 'Last reported context usage'
                    : usage.kind === 'estimated'
                      ? 'Estimated context usage'
                      : 'Reported context usage'
                }
                aria-valuetext={`${usage.used.toLocaleString(locale)} of ${usage.limit!.toLocaleString(locale)} tokens (${usage.kind === 'estimated' ? 'estimated' : 'reported'}${value.stale ? ', stale snapshot' : ''})`}
              />
            ) : (
              <p className={s.warning}>Reported context usage exceeds the supplied limit.</p>
            ))}
          {usage && !usageVerified && (
            <p className={s.warning}>
              Usage metadata is incomplete. Token usage cannot be verified.
            </p>
          )}
          {usage && (
            <p className={s.muted}>
              {usage.model} · <ObservationTime value={usage.measuredAt} />. Totals may include
              instructions, tools and reserved output.
            </p>
          )}
          <label className={s.field}>
            Show context
            <Select
              value={filter}
              onValueChange={setFilter}
              options={[
                { value: 'all', label: 'All sources' },
                { value: 'selected', label: 'Selected sources' },
                { value: 'included', label: 'Reported included' },
                { value: 'excluded', label: 'Excluded sources' },
              ]}
            />
          </label>
          {!shown.length ? (
            <p className={s.emptyState}>No sources match this view.</p>
          ) : variant === 'table' ? (
            <div
              className={`${s.tableScroll} ${context.tableScroll}`}
              tabIndex={0}
              role="region"
              aria-label="Context source breakdown"
            >
              <table className={`${s.table} ${context.table}`}>
                <caption>Sources in context</caption>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Selection</th>
                    <th scope="col">Inclusion</th>
                    <th scope="col">Tokens and details</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => (
                    <tr key={item.id}>
                      <th scope="row">
                        <div className={context.cellContent}>
                          {item.label}
                          <span className={context.metadataLine}>v{item.version}</span>
                        </div>
                      </th>
                      <td>{item.selected ? 'Selected' : 'Not selected'}</td>
                      <td>
                        <ContextState item={item} stale={!!value.stale} />
                      </td>
                      <td>
                        <div className={context.cellContent}>
                          <TokenDetail item={item} />
                          {item.reason && <p className={s.muted}>{item.reason}</p>}
                          {item.access !== 'available' && (
                            <p className={s.warning}>Access {item.access}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : variant === 'accordion' ? (
            <Accordion
              type="multiple"
              region={false}
              variant="divided"
              items={shown.map((item) => ({
                value: item.id,
                title: (
                  <span className={s.summaryTitle}>
                    {item.label}
                    <ContextState item={item} stale={!!value.stale} />
                  </span>
                ),
                content: details(item),
              }))}
            />
          ) : (
            <ul className={s.inspectorList}>
              {shown.map((item) => (
                <li key={item.id}>
                  <div className={s.row}>
                    <strong className={s.grow}>{item.label}</strong>
                    <ContextState item={item} stale={!!value.stale} />
                  </div>
                  {details(item)}
                </li>
              ))}
            </ul>
          )}
          <p className={s.muted}>
            Snapshot {value.revision} · {value.source || 'Source not supplied'} ·{' '}
            <ObservationTime value={value.observedAt} />
          </p>
        </>
      )}
    </Panel>
  );
}
