'use client';
import { toolCallFrom } from '@stackunseen/ui-core';
import type { ToolCallData, ToolCallInput } from '@stackunseen/ui-core';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Accordion } from '../accordion/accordion.js';
import type { DetailProps, VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { ToolCall } from '../tool-call/tool-call.js';
import { ToolContext, ToolDetailContext } from '../tool-call/tool-context.js';
export function ToolGroup({
  tools: inputs,
  variant = 'stack',
  detail = 'compact',
}: VariantProps<'ToolGroup'> & DetailProps & { tools: readonly (ToolCallData | ToolCallInput)[] }) {
  const tools = inputs.map(toolCallFrom);
  return (
    <div className={s.toolGroup} data-variant={variant} data-detail={detail}>
      {!tools.length ? (
        <p className={s.muted}>No tool calls reported.</p>
      ) : (
        <div className={s.muted}>
          {tools.filter((t) => t.state === 'succeeded').length} of {tools.length} tools complete
          {tools.some((t) => t.state === 'failed') ? ' · Contains failures' : ''}
        </div>
      )}
      {variant === 'list' ? (
        <div className={s.toolList}>
          {tools.map((tool) => (
            <ToolCall key={tool.id} value={tool} variant="row" detail={detail} />
          ))}
        </div>
      ) : variant === 'accordion' ? (
        <Accordion
          region={false}
          type="multiple"
          items={tools.map((tool) => ({
            value: tool.id,
            title: (
              <span className={s.row}>
                <span>{tool.name}</span>
                <StatusBadge state={tool.state} />
              </span>
            ),
            content: (
              <ToolContext.Provider value={tool}>
                <ToolDetailContext.Provider value={detail}>
                  <ToolCall.Input />
                  <ToolCall.Result />
                </ToolDetailContext.Provider>
              </ToolContext.Provider>
            ),
          }))}
        />
      ) : (
        <div className={s.collection}>
          {tools.map((tool) => (
            <ToolCall key={tool.id} value={tool} detail={detail} />
          ))}
        </div>
      )}
    </div>
  );
}
