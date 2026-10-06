import type { MessageData, MessagePart, RuntimeSnapshot } from '@stackunseen/ui-core';
import { initialSnapshot, source, tool } from './fixtures';

export const partStates = [
  'Mixed parts',
  'Streaming parts',
  'Failed parts',
  'Interrupted parts',
  'Missing parts',
  'Revoked source',
  'Changed source',
  'Unsupported part',
  'Empty parts',
  'Live parts',
  'Long parts',
  'Long single',
];
const paragraph =
  'A **completed** section stays available while the host sends the next section. Review each independent section before acting.\n\n';
export function partsSnapshot(state: string): RuntimeSnapshot {
  const streaming = ['Streaming parts', 'Live parts', 'Long parts', 'Long single'].includes(state);
  const parts: MessagePart[] =
    state === 'Empty parts'
      ? []
      : [
          {
            id: 'intro',
            type: 'text',
            format: 'markdown',
            state: 'complete',
            text: '# Review prepared\n\nThree accounts need an **owner review**. This is a synthetic example.',
          },
          { id: 'call', type: 'tool', toolCallId: tool.id },
          {
            id: 'policy',
            type: 'source',
            sourceId: source.id,
            version: source.version,
            locator: source.locator,
          },
          { id: 'file', type: 'attachment', attachmentId: 'review-file', version: '1' },
          {
            id: 'answer',
            type: 'text',
            format: 'markdown',
            state: streaming
              ? 'streaming'
              : ['Failed parts', 'Interrupted parts'].includes(state)
                ? 'interrupted'
                : 'complete',
            text:
              'The proposed next step is **reviewing the owners' +
              (streaming || ['Failed parts', 'Interrupted parts'].includes(state) ? '' : '**.'),
          },
        ];
  if (state === 'Unsupported part')
    parts.splice(4, 0, {
      id: 'future',
      type: 'unsupported',
      kind: 'future-chart',
      label: 'A newer visualization format',
    });
  if (state.startsWith('Long '))
    parts.splice(
      0,
      parts.length,
      ...Array.from({ length: 40 }, (_, index): MessagePart => ({
        id: `section-${index}`,
        type: 'text',
        format: 'markdown',
        state: 'complete',
        text: `# Section ${index + 1}\n\n${paragraph.repeat(10)}`,
      })),
      {
        id: 'answer',
        type: 'text',
        format: 'markdown',
        state: 'streaming',
        text: 'Current section: ',
      },
    );
  const value: MessageData = {
    id: 'structured-example',
    role: 'assistant',
    revision: 0,
    createdAt: '2026-09-30T00:00:00Z',
    state: streaming
      ? 'streaming'
      : state === 'Failed parts'
        ? 'failed'
        : state === 'Interrupted parts'
          ? 'interrupted'
          : 'complete',
    error:
      state === 'Failed parts'
        ? {
            code: 'DEMO_TIMEOUT',
            message: 'The synthetic host timed out. Received content is retained.',
          }
        : undefined,
    ...(state === 'Long single'
      ? { text: parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n\n') }
      : { parts }),
  };
  const base = initialSnapshot();
  return {
    ...base,
    schemaVersion: 2,
    run: { ...base.run, lifecycle: 'running' },
    messages: [value],
    tools: state === 'Missing parts' ? [] : [tool],
    sources:
      state === 'Missing parts'
        ? []
        : [
            {
              ...source,
              access: state === 'Revoked source' ? 'revoked' : 'available',
              version: state === 'Changed source' ? 'changed-version' : source.version,
            },
          ],
  };
}
