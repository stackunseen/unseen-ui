'use client';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { toolCallFrom } from '@stackunseen/ui-core';
import type { ToolCallData, ToolCallInput } from '@stackunseen/ui-core';
import { Panel } from '../panel/panel.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Accordion } from '../accordion/accordion.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { SummaryHeading } from '../../shared/summary-heading.js';
import { useDisclosure } from '../../shared/disclosure.js';
import type { DetailProps, VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import own from './tool-call.module.css';
import css from './tools.module.css';
import { ToolResult } from '../tool-result/tool-result.js';
import { ToolContext, ToolDetailContext } from './tool-context.js';
/** States in which a host duration describes a finished call rather than a stale number. */
const settledStates = new Set<ToolCallData['state']>([
  'succeeded',
  'failed',
  'cancelled',
  'denied',
  'outcome-unknown',
]);
function useTool() {
  const value = useContext(ToolContext);
  if (!value) throw new Error('ToolCall parts require ToolCall.Root.');
  return value;
}

function ToolSummary() {
  const value = useTool();
  return (
    <div className={s.row}>
      <SummaryHeading
        icon={
          <span className={own.toolIcon} aria-hidden="true">
            <AIIcon name="tool" />
          </span>
        }
      >
        {value.name}
      </SummaryHeading>
      <StatusBadge state={value.state} />
    </div>
  );
}

function ToolInput() {
  const value = useTool();
  const detail = useContext(ToolDetailContext);
  return (
    <Accordion
      region={false}
      type="single"
      collapsible
      items={[
        {
          value: 'input',
          title: detail === 'full' ? `Input · revision ${value.revision}` : 'Input',
          content: (
            <>
              <pre
                className={`${s.code} ${css.preview}`}
                tabIndex={0}
                role="group"
                aria-label={`${value.name} input preview`}
              >
                {value.input.slice(0, 4000)}
              </pre>
              {value.input.length > 4000 && (
                <span className={s.muted}>Input preview truncated.</span>
              )}
            </>
          ),
        },
      ]}
    />
  );
}

function ToolOutput() {
  const value = useTool();
  const detail = useContext(ToolDetailContext);
  return (
    <div>
      {value.state === 'outcome-unknown' ? (
        <p className={s.warning}>The result is unknown. Reconcile with the host before retrying.</p>
      ) : value.output !== undefined || value.error ? (
        <ToolResult
          text={value.output}
          error={value.error}
          label={`${value.name} output preview`}
        />
      ) : (
        <p className={s.muted}>
          {value.state === 'running' ? (
            <LoadingIndicator variant="dots" label="Waiting for a host result" size="small" />
          ) : (
            {
              queued: 'Queued. The tool has not started.',
              'input-streaming': 'Receiving tool input. The tool has not started.',
              'approval-required': 'Waiting for approval. The tool has not started.',
              succeeded: 'Tool completed without output.',
              failed: 'Tool failed. The host did not provide error details.',
              denied: 'Execution was denied.',
              cancelled: 'Tool execution was cancelled.',
            }[value.state]
          )}
        </p>
      )}
      {detail === 'full' && value.durationMs !== undefined && settledStates.has(value.state) && (
        <small className={s.muted}>Host duration: {value.durationMs} ms</small>
      )}
    </div>
  );
}

/** States a row keeps as a labelled badge; the rest read from a small icon. */
const exceptionStates = new Set<ToolCallData['state']>([
  'failed',
  'denied',
  'cancelled',
  'approval-required',
  'outcome-unknown',
]);
function formatDuration(ms: number) {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

/** One line per step: status, label, target and host duration; details open below. */
function ToolRow() {
  const value = useTool();
  const disclosure = useDisclosure({});
  const problem = !!value.error || value.state === 'failed' || value.state === 'outcome-unknown';
  const duration =
    value.durationMs !== undefined &&
    Number.isFinite(value.durationMs) &&
    value.durationMs >= 0 &&
    settledStates.has(value.state)
      ? formatDuration(value.durationMs)
      : undefined;
  return (
    <>
      <button className={css.rowTrigger} {...disclosure.triggerProps}>
        <StatusBadge
          state={value.state}
          variant={exceptionStates.has(value.state) ? 'soft' : 'icon'}
        />
        <span className={css.rowLabel}>{value.label ?? <code>{value.name}</code>}</span>
        {value.target && <span className={css.rowTarget}>{value.target}</span>}
        {duration && <span className={css.rowMeta}>{duration}</span>}
        <AIIcon name={disclosure.open ? 'collapse' : 'expand'} />
      </button>
      {problem && <ToolOutput />}
      <div {...disclosure.contentProps} className={css.rowBody}>
        {value.input && (
          <pre
            className={`${s.code} ${css.preview}`}
            tabIndex={0}
            role="group"
            aria-label={`${value.name} input preview`}
          >
            {value.input.slice(0, 4000)}
          </pre>
        )}
        {!problem && <ToolOutput />}
      </div>
    </>
  );
}

function ToolRoot({
  value: input,
  children,
  variant = 'card',
  detail = 'compact',
}: VariantProps<'ToolCall'> &
  DetailProps & {
    /** Host data, or the short form `{ name }` plus what is known. */
    value: ToolCallData | ToolCallInput;
    children?: ReactNode;
  }) {
  const value = toolCallFrom(input);
  if (variant === 'row' && !children)
    return (
      <ToolContext.Provider value={value}>
        <ToolDetailContext.Provider value={detail}>
          <div data-part="tool-call" data-variant="row" data-detail={detail} className={css.row}>
            <ToolRow />
          </div>
        </ToolDetailContext.Provider>
      </ToolContext.Provider>
    );
  return (
    <ToolContext.Provider value={value}>
      <ToolDetailContext.Provider value={detail}>
        <Panel
          data-part="tool-call"
          data-variant={variant}
          data-detail={detail}
          className={s.toolCall}
        >
          {children ?? (
            <>
              <ToolSummary />
              {variant === 'compact' ? (
                <>
                  {(value.error ||
                    value.state === 'failed' ||
                    value.state === 'outcome-unknown') && <ToolOutput />}
                  <Accordion
                    region={false}
                    type="single"
                    collapsible
                    items={[
                      {
                        value: 'execution',
                        title: 'Inspect execution',
                        content: (
                          <>
                            <ToolInput />
                            {!value.error &&
                              value.state !== 'failed' &&
                              value.state !== 'outcome-unknown' && <ToolOutput />}
                          </>
                        ),
                      },
                    ]}
                  />
                </>
              ) : (
                <>
                  <ToolInput />
                  <ToolOutput />
                </>
              )}
            </>
          )}
        </Panel>
      </ToolDetailContext.Provider>
    </ToolContext.Provider>
  );
}

export const ToolCall = Object.assign(ToolRoot, {
  Root: ToolRoot,
  Summary: ToolSummary,
  Input: ToolInput,
  Result: ToolOutput,
});
