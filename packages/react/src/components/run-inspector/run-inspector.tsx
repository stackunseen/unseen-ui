'use client';
import { IconButton } from '../icon-button/icon-button.js';
import { Accordion } from '../accordion/accordion.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import type { DetailProps, VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/agent-controls.module.css';
import c from '../../shared/styles/coding.module.css';
import a from '../../shared/styles/action-layout.module.css';
import { stateLabel } from '../../shared/labels.js';

export interface RunSpan {
  id: string;
  name: string;
  kind: 'model' | 'tool' | 'agent' | 'retrieval';
  state: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  durationMs?: number;
  parentId?: string;
  summary?: string;
}

export interface RunInspectorProps extends VariantProps<'RunInspector'>, DetailProps {
  runId: string;
  /** A host-owned window of up to 200 spans. Replace the window to inspect later spans. */
  spans: readonly RunSpan[];
  usage?: { tokens: number; source: string };
  onSelect?: (span: RunSpan) => void;
}

const badgeState: Record<RunSpan['state'], string> = {
  queued: 'queued',
  running: 'running',
  complete: 'succeeded',
  failed: 'failed',
  cancelled: 'cancelled',
};

export function RunInspector({
  runId,
  spans,
  usage,
  onSelect,
  variant = 'accordion',
  detail = 'compact',
}: RunInspectorProps) {
  function body(span: RunSpan) {
    return (
      <div className={s.root}>
        {detail === 'full' && (
          <p className={s.muted}>
            {stateLabel(span.kind)}
            {span.parentId ? ` · Parent ${span.parentId}` : ''}
          </p>
        )}
        <p>{span.summary?.slice(0, 5000) || 'No public summary supplied.'}</p>
        {detail === 'full' && (
          <p className={s.muted}>
            Duration:{' '}
            {span.durationMs !== undefined &&
            Number.isFinite(span.durationMs) &&
            span.durationMs >= 0
              ? `${span.durationMs}ms`
              : 'Not measured'}
          </p>
        )}
        {onSelect && (
          <IconButton
            className={a.local}
            icon="search"
            label={`Inspect span: ${span.name}`}
            onClick={() => onSelect(span)}
          />
        )}
      </div>
    );
  }
  return (
    <div className={s.root} data-part="run-inspector" data-variant={variant} data-detail={detail}>
      <strong>
        Run <code>{runId}</code>
      </strong>
      <p className={s.muted}>
        {usage && Number.isSafeInteger(usage.tokens) && usage.tokens >= 0 && usage.source.trim()
          ? `${usage.tokens.toLocaleString('en-US')} tokens · ${usage.source}`
          : 'Usage not reported'}
      </p>
      {!spans.length ? (
        <p className={s.muted}>No execution spans reported.</p>
      ) : variant === 'accordion' ? (
        <Accordion
          type="multiple"
          items={spans.slice(0, 200).map((span) => ({
            value: span.id,
            title: (
              <span className={s.row}>
                <span>{span.name}</span>
                <StatusBadge state={badgeState[span.state]} />
              </span>
            ),
            content: body(span),
          }))}
        />
      ) : (
        <ul className={c.list}>
          {spans.slice(0, 200).map((span) => (
            <li className={c.test} key={span.id}>
              <div className={s.row}>
                <strong>{span.name}</strong>
                <StatusBadge state={badgeState[span.state]} />
              </div>
              {body(span)}
            </li>
          ))}
        </ul>
      )}
      {spans.length > 200 && (
        <p className={s.muted}>
          Showing the first 200 execution spans. Request a different host data window to inspect
          more.
        </p>
      )}
    </div>
  );
}
