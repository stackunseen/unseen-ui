'use client';
import type { ComponentProps } from 'react';
import { Button } from '../button/button.js';
import { Accordion } from '../accordion/accordion.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import c from '../../shared/styles/coding.module.css';
import g from '../../shared/styles/structured.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { Input } from '../input/input.js';

export interface AuditRecord {
  id: string;
  time: string;
  actor: string;
  action: string;
  scope: string;
  correlationId: string;
  outcome: string;
  redacted?: boolean;
  detail?: string;
}

export interface AuditTrailProps extends VariantProps<'AuditTrail'>, ComponentProps<'div'> {
  /** A host-owned window of up to 200 records. onLoadMore should replace the window when it reaches this cap. */
  records: readonly AuditRecord[];
  query: string;
  onQueryChange: (query: string) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}

export function AuditTrail({
  records,
  query,
  onQueryChange,
  onLoadMore,
  loading,
  variant = 'timeline',
  className = '',
  ...rest
}: AuditTrailProps) {
  return (
    <div
      {...rest}
      className={`${s.root} ${className}`}
      data-part="audit-trail"
      data-variant={variant}
    >
      <strong>Audit trail</strong>
      <Input
        className={s.search}
        aria-label="Search audit records"
        placeholder="Search audit records…"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {!records.length ? (
        <p className={s.muted}>{loading ? 'Loading records…' : 'No matching audit records.'}</p>
      ) : variant === 'table' ? (
        <div className={c.scroll} tabIndex={0} role="group" aria-label="Audit records">
          <table className={g.table}>
            <caption>Audit records</caption>
            <thead>
              <tr>
                <th scope="col">When / who</th>
                <th scope="col">Action</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 200).map((record) => (
                <tr key={record.id}>
                  <td>
                    {record.time}
                    <br />
                    {record.actor}
                  </td>
                  <td>
                    {record.redacted ? 'Redacted action' : record.action}
                    <br />
                    <small>{record.scope}</small>
                  </td>
                  <td>{record.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className={c.list}>
          {records.slice(0, 200).map((record) => (
            <li className={c.test} key={record.id}>
              <div className={s.header}>
                <strong>{record.redacted ? 'Redacted action' : record.action}</strong>
                <span className={s.tag}>{record.outcome}</span>
              </div>
              <p className={s.muted}>
                {record.time} · {record.actor} · {record.scope}
              </p>
              <p className={s.muted}>Correlation: {record.correlationId}</p>
              {!record.redacted && record.detail && (
                <Accordion
                  type="single"
                  collapsible
                  items={[
                    {
                      value: 'detail',
                      title: 'Record details',
                      content: <p>{record.detail.slice(0, 10000)}</p>,
                    },
                  ]}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      {onLoadMore && (
        <Button
          size="sm"
          className={a.local}
          variant="outline"
          disabled={loading}
          onClick={onLoadMore}
        >
          Load more records
        </Button>
      )}
      {records.length > 200 && (
        <p className={s.muted}>Showing the first 200 records. Load more to see the rest.</p>
      )}
    </div>
  );
}
