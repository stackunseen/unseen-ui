'use client';
import { useState } from 'react';
import { Button, Message, resolveVariant } from '@ai-interaction/react';
import { MarkdownResponse } from '@ai-interaction/react/markdown';
import type { MessageData } from '@ai-interaction/core';

import { markdownExamples } from '../lib/markdown-fixtures';
const chunks = [
  '# Streaming example\n\nA stable paragraph stays selectable.\n\n',
  'The next step is **review',
  ' the records**.\n\nRead [the policy](https://example.com/pol',
  'icy).\n\n```ts\nconst review = ',
  'true;\n```',
];

export function MarkdownSpecimen({
  name,
  state,
  presentation,
}: {
  name: 'Message' | 'StreamingResponse';
  state: string;
  presentation?: string;
}) {
  const [chunk, setChunk] = useState(1);
  const [status, setStatus] = useState<MessageData['state']>('streaming');
  const live = state === 'Live stream';
  const value: MessageData = {
    id: 'rich-response',
    role: 'assistant',
    revision: live ? chunk : 1,
    text: live
      ? chunks.slice(0, chunk).join('')
      : (markdownExamples[state] ?? markdownExamples.Markdown!),
    state: live ? status : state === 'Incomplete Markdown' ? 'streaming' : 'complete',
  };
  const response = ({ text, state: responseState }: MessageData) => (
    <MarkdownResponse
      variant={
        name === 'StreamingResponse' ? resolveVariant('StreamingResponse', presentation) : 'cursor'
      }
      text={text ?? ''}
      state={responseState}
    />
  );
  return (
    <div>
      {name === 'Message' ? (
        <Message
          value={value}
          variant={resolveVariant('Message', presentation)}
          renderContent={response}
        />
      ) : (
        response(value)
      )}
      {live && (
        <div
          className="specimen-stream-controls"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--ai-gap, 8px)',
            marginBlockStart: 16,
          }}
          role="group"
          aria-label="Synthetic stream controls"
        >
          <Button
            variant="outline"
            disabled={status !== 'streaming' || chunk >= chunks.length}
            onClick={() => setChunk((current) => current + 1)}
          >
            Append chunk
          </Button>
          <Button
            variant="outline"
            disabled={status !== 'streaming' || chunk !== chunks.length}
            onClick={() => setStatus('complete')}
          >
            Complete response
          </Button>
          <Button
            variant="ghost"
            disabled={status !== 'streaming'}
            onClick={() => setStatus('interrupted')}
          >
            Interrupt response
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setChunk(1);
              setStatus('streaming');
            }}
          >
            Restart sample
          </Button>
        </div>
      )}
    </div>
  );
}
