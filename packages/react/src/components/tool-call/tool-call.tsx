'use client';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import type { ToolCallData } from '@stackunseen/ui-core';
import { Panel } from '../panel/panel.js';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Accordion } from '../accordion/accordion.js';
import { AIIcon } from '../../providers/icons/icons.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import { SummaryHeading } from '../../shared/summary-heading.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import css from './tools.module.css';
import { ToolResult } from '../tool-result/tool-result.js';
import { ToolContext } from './tool-context.js';
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
          <span className={s.toolIcon} aria-hidden="true">
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
  return (
    <Accordion
      region={false}
      type="single"
      collapsible
      items={[
        {
          value: 'input',
          title: `Input · revision ${value.revision}`,
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
      {value.durationMs !== undefined && (
        <small className={s.muted}>Host duration: {value.durationMs} ms</small>
      )}
    </div>
  );
}

function ToolRoot({
  value,
  children,
  variant = 'card',
}: VariantProps<'ToolCall'> & { value: ToolCallData; children?: ReactNode }) {
  return (
    <ToolContext.Provider value={value}>
      <Panel data-part="tool-call" data-variant={variant} className={s.toolCall}>
        {children ?? (
          <>
            <ToolSummary />
            {variant === 'compact' ? (
              <>
                {(value.error || value.state === 'failed' || value.state === 'outcome-unknown') && (
                  <ToolOutput />
                )}
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
    </ToolContext.Provider>
  );
}

export const ToolCall = Object.assign(ToolRoot, {
  Root: ToolRoot,
  Summary: ToolSummary,
  Input: ToolInput,
  Result: ToolOutput,
});
