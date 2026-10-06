'use client';
import { useEffect, useState } from 'react';
import { createRuntime } from '@stackunseen/ui-core';
import type { Event, Runtime } from '@stackunseen/ui-core';
import {
  Button,
  Message,
  LoadingIndicator,
  RuntimeProvider,
  useRuntimeSelector,
  resolveVariant,
} from '@stackunseen/ui';
import { MarkdownResponse, renderMarkdownPart } from '@stackunseen/ui/markdown';
import type { MessageAttachment } from '@stackunseen/ui';
import { partsSnapshot } from '../lib/message-parts-fixtures';
import { source as fixtureSource } from '../lib/fixtures';
type Body = Event extends infer E ? (E extends Event ? Pick<E, 'type' | 'payload'> : never) : never;
const file: MessageAttachment = {
  id: 'review-file',
  version: '1',
  value: {
    name: 'Owner review.txt',
    state: 'ready',
    mediaType: 'text/plain',
    preview: {
      kind: 'text',
      text: 'Synthetic owner-review notes. No external action has been performed.',
    },
  },
};

export function MessagePartsSpecimen({
  state,
  presentation,
}: {
  state: string;
  presentation?: string;
}) {
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  useEffect(() => {
    const next = createRuntime(partsSnapshot(state));
    setRuntime(next);
    return () => next.dispose();
  }, [state]);
  if (!runtime) return <LoadingIndicator label="Preparing the message example" />;
  return (
    <RuntimeProvider runtime={runtime}>
      <PartsPreview key={state} runtime={runtime} state={state} presentation={presentation} />
    </RuntimeProvider>
  );
}
function PartsPreview({
  runtime,
  state,
  presentation,
}: {
  runtime: Runtime;
  state: string;
  presentation?: string;
}) {
  const value = useRuntimeSelector((snapshot) => snapshot.messages[0]!);
  const sources = useRuntimeSelector((snapshot) => snapshot.sources);
  const tools = useRuntimeSelector((snapshot) => snapshot.tools);
  const diagnostic = useRuntimeSelector((snapshot) => snapshot.diagnostic);
  const [fileMode, setFileMode] = useState<
    'current' | 'revoked' | 'changed' | 'missing' | 'ambiguous'
  >('current');
  const [checkpoints, setCheckpoints] = useState(0);
  const live = state === 'Live parts' || state.startsWith('Long ');
  const last = value.parts?.at(-1);
  const active = last?.type === 'text' && last.state === 'streaming';
  const streaming = value.state === 'streaming';
  function send(body: Body) {
    const current = runtime.getSnapshot();
    const sequence = current.lastSequence + 1;
    runtime.ingest({
      ...body,
      schemaVersion: 2,
      eventId: `parts-${sequence}`,
      streamId: current.streamId,
      sequence,
      runId: current.run.id,
      threadId: current.run.threadId,
      attemptId: current.run.attemptId,
      occurredAt: '2026-09-30T00:00:00Z',
    });
  }
  function append() {
    if (value.parts && active)
      send({
        type: 'message.part.delta',
        payload: {
          id: value.id,
          partId: last.id,
          offset: last.text.length,
          text: ' another update',
        },
      });
    else if (value.text !== undefined)
      send({
        type: 'message.delta',
        payload: { id: value.id, offset: value.text.length, text: ' another update' },
      });
  }
  return (
    <div data-parts-demo={state}>
      {live && (
        <div
          role="group"
          aria-label="Synthetic part controls"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBlockEnd: 16 }}
        >
          <Button
            variant="outline"
            onClick={append}
            disabled={!streaming || (!!value.parts && !active)}
          >
            Append text
          </Button>
          {value.parts && (
            <>
              <Button
                variant="outline"
                disabled={!active || !streaming}
                onClick={() =>
                  send({
                    type: 'message.part.completed',
                    payload: { id: value.id, partId: last!.id },
                  })
                }
              >
                Finish part
              </Button>
              <Button
                variant="outline"
                disabled={active || !streaming || value.parts.length >= 100}
                onClick={() =>
                  send({
                    type: 'message.part.added',
                    payload: {
                      id: value.id,
                      part: {
                        id: `new-${value.parts!.length}`,
                        type: 'text',
                        format: 'markdown',
                        state: 'streaming',
                        text: 'A new section',
                      },
                    },
                  })
                }
              >
                Add section
              </Button>
            </>
          )}
          <Button
            variant="outline"
            disabled={!streaming || !!active}
            onClick={() => send({ type: 'message.completed', payload: { id: value.id } })}
          >
            Complete message
          </Button>
          <Button
            variant="ghost"
            disabled={!streaming}
            onClick={() =>
              send({
                type: 'message.failed',
                payload: {
                  id: value.id,
                  error: { code: 'DEMO_FAILURE', message: 'The synthetic stream failed.' },
                },
              })
            }
          >
            Fail response
          </Button>
          <Button
            variant="ghost"
            disabled={!streaming}
            onClick={() =>
              send({
                type: 'run.updated',
                payload: { lifecycle: 'cancelled', version: runtime.getSnapshot().run.version + 1 },
              })
            }
          >
            Cancel run
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              runtime.replaceSnapshot(runtime.getSnapshot());
              setCheckpoints((count) => count + 1);
            }}
          >
            Checkpoint fixture
          </Button>
          <span role="status">Fixture checkpoints: {checkpoints}</span>
          {state === 'Live parts' && (
            <>
              <Button
                variant="ghost"
                disabled={!sources[0] || sources[0].access === 'revoked'}
                onClick={() =>
                  send({ type: 'source.updated', payload: { ...sources[0]!, access: 'revoked' } })
                }
              >
                Revoke source
              </Button>
              <Button
                variant="ghost"
                disabled={fileMode === 'revoked'}
                onClick={() => setFileMode('revoked')}
              >
                Revoke file
              </Button>
              <Button
                variant="ghost"
                disabled={fileMode === 'changed'}
                onClick={() => setFileMode('changed')}
              >
                Change file version
              </Button>
              <Button
                variant="ghost"
                disabled={fileMode === 'missing'}
                onClick={() => setFileMode('missing')}
              >
                Remove file
              </Button>
              <Button
                variant="ghost"
                disabled={fileMode === 'ambiguous'}
                onClick={() => setFileMode('ambiguous')}
              >
                Duplicate file record
              </Button>
              <Button
                variant="ghost"
                disabled={fileMode === 'current'}
                onClick={() => setFileMode('current')}
              >
                Restore file
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  send({
                    type: 'source.updated',
                    payload: {
                      ...fixtureSource,
                      version: 'new-version',
                      excerpt: 'New version content requires a new reference.',
                    },
                  })
                }
              >
                Change source version
              </Button>
              <Button
                variant="ghost"
                onClick={() => runtime.replaceSnapshot({ ...runtime.getSnapshot(), sources: [] })}
              >
                Remove source
              </Button>
              <Button
                variant="ghost"
                onClick={() => send({ type: 'source.updated', payload: fixtureSource })}
              >
                Restore source
              </Button>
            </>
          )}
        </div>
      )}
      <Message
        renderTextPart={renderMarkdownPart}
        renderContent={
          value.parts
            ? undefined
            : (message) => (
                <MarkdownResponse
                  text={message.text ?? ''}
                  state={message.state}
                  error={message.error?.message}
                />
              )
        }
        value={value}
        variant={resolveVariant('Message', presentation)}
        sources={sources}
        tools={tools}
        attachments={
          state === 'Missing parts' || fileMode === 'missing'
            ? []
            : fileMode === 'ambiguous'
              ? [file, file]
              : fileMode === 'changed'
                ? [
                    {
                      ...file,
                      version: '2',
                      value: {
                        ...file.value,
                        name: 'Replacement review.txt',
                        preview: {
                          kind: 'text',
                          text: 'Replacement file content belongs to version 2.',
                        },
                      },
                    },
                  ]
                : [
                    {
                      ...file,
                      value:
                        fileMode === 'revoked' ? { ...file.value, access: 'revoked' } : file.value,
                    },
                  ]
        }
      />
      {diagnostic && <p role="alert">{diagnostic}</p>}
    </div>
  );
}
