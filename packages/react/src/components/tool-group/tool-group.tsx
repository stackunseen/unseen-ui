'use client';
import type { ToolCallData } from '@stackunseen/ui-core';
import { StatusBadge } from '../status-badge/status-badge.js';
import { Accordion } from '../accordion/accordion.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import { ToolCall } from '../tool-call/tool-call.js';
import { ToolContext } from '../tool-call/tool-context.js';
export function ToolGroup({
  tools,
  variant = 'stack',
}: VariantProps<'ToolGroup'> & { tools: ToolCallData[] }) {
  return (
    <div className={s.toolGroup} data-variant={variant}>
      {!tools.length ? (
        <p className={s.muted}>No tool calls reported.</p>
      ) : (
        <div className={s.muted}>
          {tools.filter((t) => t.state === 'succeeded').length} of {tools.length} tools complete
          {tools.some((t) => t.state === 'failed') ? ' · Contains failures' : ''}
        </div>
      )}
      {variant === 'accordion' ? (
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
                <ToolCall.Input />
                <ToolCall.Result />
              </ToolContext.Provider>
            ),
          }))}
        />
      ) : (
        <div className={s.collection}>
          {tools.map((tool) => (
            <ToolCall key={tool.id} value={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
