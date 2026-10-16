'use client';
import { memo } from 'react';
import type { ReactNode } from 'react';
import type {
  MessageData,
  MessagePart,
  TextMessagePart,
  Source,
  ToolCallData,
} from '@stackunseen/ui-core';
import { Attachment } from '../attachment/attachment.js';
import type { AttachmentProps } from '../attachment/attachment.js';
import { Citation } from '../citation/citation.js';
import { ToolCall } from '../tool-call/tool-call.js';
import { ResponseStatus, StreamingResponse } from '../streaming-response/streaming-response.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import type { ComponentVariant } from '../../shared/variants.js';
import s from './message-content.module.css';

/** Host-resolved file version; access/preview/callbacks retain Attachment's contracts. */
export interface MessageAttachment {
  id: string;
  version: string;
  value: Pick<
    AttachmentProps,
    'name' | 'state' | 'access' | 'preview' | 'mediaType' | 'sizeBytes' | 'detail' | 'onOpen'
  >;
}
export interface MessageContentProps {
  value: MessageData;
  sources?: readonly Source[];
  tools?: readonly ToolCallData[];
  attachments?: readonly MessageAttachment[];
  responseVariant?: ComponentVariant<'StreamingResponse'>;
  /** Keep the callback stable to preserve completed-part memoization. */
  renderTextPart?: (
    part: TextMessagePart,
    variant: ComponentVariant<'StreamingResponse'>,
  ) => ReactNode;
  /** Host view for a tool call. Return undefined to keep the default card. Keep it stable. */
  renderTool?: (tool: ToolCallData) => ReactNode | undefined;
}
function unique<T extends { id: string }>(
  items: readonly T[] | undefined,
  id: string,
): T | undefined {
  const matches = items?.filter((item) => item.id === id);
  return matches?.length === 1 ? matches[0] : undefined;
}
const PartView = memo(function PartView({
  part,
  source,
  tool,
  attachment,
  citationNumber,
  responseVariant,
  renderTextPart,
  renderTool,
}: {
  part: MessagePart;
  source?: Source;
  tool?: ToolCallData;
  attachment?: MessageAttachment;
  citationNumber: number;
  responseVariant: ComponentVariant<'StreamingResponse'>;
  renderTextPart?: MessageContentProps['renderTextPart'];
  renderTool?: MessageContentProps['renderTool'];
}) {
  let content: ReactNode;
  switch (part.type) {
    case 'text':
      content = renderTextPart ? (
        renderTextPart(part, responseVariant)
      ) : (
        <StreamingResponse
          text={part.text}
          state={part.state}
          variant={responseVariant}
          showStatus={false}
        />
      );
      break;
    case 'tool':
      content = tool ? (
        (renderTool?.(tool) ?? <ToolCall value={tool} variant="compact" />)
      ) : (
        <p className={s.unavailable}>
          Tool result unavailable. The host has not resolved this call.
        </p>
      );
      break;
    case 'source':
      content = <Citation source={source} reference={part} number={citationNumber} />;
      break;
    case 'attachment':
      content = (
        <Attachment
          {...(attachment?.version === part.version
            ? attachment.value
            : { name: 'Attachment', state: 'ready', access: 'missing' })}
          reference={{ attachmentId: part.attachmentId, version: part.version }}
          resource={
            attachment ? { attachmentId: attachment.id, version: attachment.version } : undefined
          }
          variant="row"
        />
      );
      break;
    case 'unsupported':
      content = (
        <p className={s.unavailable}>
          Unsupported content: {part.label} <span>({part.kind})</span>
        </p>
      );
      break;
  }
  return (
    <div data-message-part-id={part.id} data-message-part-type={part.type}>
      {content}
    </div>
  );
});

export function MessageContent({
  value,
  sources,
  tools,
  attachments,
  responseVariant = 'cursor',
  renderTextPart,
  renderTool,
}: MessageContentProps) {
  if (!value.parts)
    return (
      <StreamingResponse
        text={value.text}
        state={value.state}
        error={value.error?.message}
        variant={responseVariant}
      />
    );
  let citationNumber = 0;
  return (
    <div className={s.parts} data-part="message-content">
      {value.parts.map((part) => {
        if (part.type === 'source') citationNumber++;
        return (
          <PartView
            key={part.id}
            part={part}
            responseVariant={responseVariant}
            renderTextPart={renderTextPart}
            renderTool={renderTool}
            citationNumber={part.type === 'source' ? citationNumber : 0}
            source={part.type === 'source' ? unique(sources, part.sourceId) : undefined}
            tool={part.type === 'tool' ? unique(tools, part.toolCallId) : undefined}
            attachment={
              part.type === 'attachment' ? unique(attachments, part.attachmentId) : undefined
            }
          />
        );
      })}
      {!value.parts.length && (
        <p className={s.unavailable}>
          {value.state === 'streaming' ? 'Preparing a response…' : 'No response content.'}
        </p>
      )}
      {value.state === 'streaming' && responseVariant !== 'cursor' && (
        <LoadingIndicator
          variant={responseVariant === 'dots' ? 'dots' : 'bars'}
          label="Receiving response"
          size="small"
        />
      )}
      <ResponseStatus state={value.state} variant={responseVariant} error={value.error?.message} />
    </div>
  );
}
