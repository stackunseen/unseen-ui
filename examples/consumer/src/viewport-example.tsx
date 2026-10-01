'use client';
import { useRef, useState } from 'react';
import { Accordion, Button, MessageActions, PromptInput, Select } from '@ai-interaction/react';
import { messageText } from '@ai-interaction/core';
import type { MessageData, NavigationAvailability } from '@ai-interaction/core';
import type {
  ConversationHistory,
  HistoryPosition,
  HistoryRestore,
} from '@ai-interaction/core/history';
import { ConversationViewport } from '@ai-interaction/react/viewport';
import type { ConversationViewportVariant } from '@ai-interaction/react/viewport';
import s from './viewport-example.module.css';

function message(index: number, scope: string): MessageData {
  return Object.freeze({
    id: `${scope}-${index}`,
    role: index % 2 ? 'assistant' : 'user',
    state: 'complete',
    revision: 0,
    text:
      index % 2
        ? `Response ${index + 1}. The action stays beside its content. This public summary explains the result and the next useful step. ${index % 7 === 0 ? '\n\nLonger replies wrap naturally without crowding the message actions. Reading earlier content should preserve your place while new output arrives.' : ''}`
        : `Message ${index + 1}. Review the component spacing in ${scope}.`,
  });
}
function frozen(value: ConversationHistory): ConversationHistory {
  Object.freeze(value.context);
  Object.freeze(value.messages);
  Object.freeze(value.older);
  Object.freeze(value.newer);
  return Object.freeze(value);
}
function seed(scope = 'main', count = 400): ConversationHistory {
  return frozen({
    context: {
      workspaceId: 'viewport-demo',
      threadId: scope,
      snapshotId: 'local-history',
      version: '0',
    },
    messages: Array.from({ length: count }, (_, i) => message(10_000 - count + i, scope)),
    startIndex: 10_000 - count,
    totalMessages: 10_000,
    older: {
      state: count === 10_000 ? 'end' : 'available',
      ...(count === 10_000 ? {} : { cursor: String(10_000 - count) }),
    },
    newer: { state: 'end' },
  });
}
/** Deterministic local host fixture. No persistence, authorization service or model call. */
export function ViewportExample() {
  const [history, setHistory] = useState(() => seed());
  const [variant, setVariant] = useState<ConversationViewportVariant>('thread');
  const [mode, setMode] = useState<'virtual' | 'reading'>('virtual');
  const [availability, setAvailability] = useState<NavigationAvailability>('ready');
  const [draft, setDraft] = useState('');
  const [restore, setRestore] = useState<HistoryRestore>();
  const [receipt, setReceipt] = useState('No position restoration requested.');
  const saved = useRef<HistoryPosition>(undefined),
    requestId = useRef(0);
  function update(change: (value: ConversationHistory) => ConversationHistory) {
    setHistory((value) =>
      frozen({
        ...change(value),
        context: { ...value.context, version: String(Number(value.context.version) + 1) },
      }),
    );
  }
  function append(text: string) {
    update((value) => {
      const id = value.totalMessages!,
        rows = [
          ...value.messages,
          Object.freeze({
            id: `${value.context.threadId}-${id}`,
            role: 'user' as const,
            text,
            state: 'complete' as const,
            revision: 0,
          }),
        ];
      const removed =
        rows.length > (mode === 'reading' ? 120 : 10_000) ? rows.splice(0, 1).length : 0;
      const startIndex = value.startIndex! + removed;
      return {
        ...value,
        messages: rows,
        startIndex,
        totalMessages: id + 1,
        older: startIndex ? { state: 'available', cursor: String(startIndex) } : { state: 'end' },
      };
    });
  }
  function grow() {
    update((value) => {
      const last = value.messages.at(-1)!;
      const text =
        messageText(last) +
        '\n\nAdditional public output arrived. The reading position should follow only when you are already at the end.';
      return {
        ...value,
        messages: [
          ...value.messages.slice(0, -1),
          Object.freeze({
            id: last.id,
            role: 'assistant' as const,
            text,
            state: 'streaming' as const,
            revision: last.revision + 1,
          }),
        ],
      };
    });
  }
  return (
    <div className={s.example} data-viewport-example>
      <div className={s.header}>
        <div>
          <h3>Long conversation</h3>
          <p>Local history · contextual actions · stable reading space</p>
        </div>
        <div className={s.settings}>
          <label>
            Layout
            <Select
              aria-label="Message layout"
              value={variant}
              onValueChange={(v) => setVariant(v as ConversationViewportVariant)}
              options={[
                { value: 'thread', label: 'Thread' },
                { value: 'bubble', label: 'Bubbles' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </label>
          <label>
            Reading
            <Select
              aria-label="History reading mode"
              value={mode}
              onValueChange={(v) => {
                setMode(v as 'virtual' | 'reading');
                setHistory(seed(history.context.threadId, v === 'reading' ? 120 : 400));
                setRestore(undefined);
              }}
              options={[
                { value: 'virtual', label: 'Windowed' },
                { value: 'reading', label: 'Full reading' },
              ]}
            />
          </label>
        </div>
      </div>
      <ConversationViewport
        value={history}
        variant={variant}
        mode={mode}
        availability={availability}
        label="Long conversation"
        restore={restore}
        onRestoreResult={(result) => setReceipt(`Position restoration: ${result.outcome}.`)}
        onPositionChange={(position) => {
          saved.current = position;
        }}
        onRequestPage={(request) => {
          if (request.cursor !== history[request.direction].cursor) return;
          update((value) => {
            if (mode === 'reading') {
              const startIndex =
                request.direction === 'older'
                  ? Math.max(0, value.startIndex! - 40)
                  : Math.min(value.totalMessages! - value.messages.length, value.startIndex! + 40);
              const end = startIndex + value.messages.length;
              return {
                ...value,
                startIndex,
                messages: Array.from({ length: value.messages.length }, (_, i) =>
                  message(startIndex + i, value.context.threadId!),
                ),
                older: startIndex
                  ? { state: 'available', cursor: String(startIndex) }
                  : { state: 'end' },
                newer:
                  end === value.totalMessages
                    ? { state: 'end' }
                    : { state: 'available', cursor: String(end) },
              };
            }
            const startIndex = Math.max(0, value.startIndex! - 40);
            return {
              ...value,
              messages: [
                ...Array.from({ length: value.startIndex! - startIndex }, (_, i) =>
                  message(startIndex + i, value.context.threadId!),
                ),
                ...value.messages,
              ],
              startIndex,
              older: startIndex
                ? { state: 'available', cursor: String(startIndex) }
                : { state: 'end' },
            };
          });
        }}
        renderActions={(row) =>
          row.state === 'complete' ? (
            <MessageActions
              variant="compact"
              text={messageText(row)}
              onEdit={
                row.role === 'user' && availability === 'ready'
                  ? () => setDraft(messageText(row))
                  : undefined
              }
            />
          ) : undefined
        }
      />
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={(text) => {
          append(text);
          setDraft('');
        }}
        disabled={availability !== 'ready' || history.newer.state !== 'end'}
        disabledReason={
          availability !== 'ready'
            ? 'This local host is not ready.'
            : history.newer.state !== 'end'
              ? 'Load newer messages before adding a local reply.'
              : undefined
        }
        variant="compact"
        placeholder="Add a local message…"
      />
      <Accordion
        type="single"
        collapsible
        role="group"
        aria-label="Local history scenarios"
        headingLevel={4}
        items={[
          {
            value: 'scenarios',
            title: 'History and access scenarios',
            content: (
              <div className={s.scenarios}>
                <div className={s.actions}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => append('A new local message arrived.')}
                  >
                    Append message
                  </Button>
                  <Button size="sm" variant="outline" onClick={grow}>
                    Grow latest response
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMode('virtual');
                      setHistory(seed(history.context.threadId, 10_000));
                    }}
                  >
                    Load 10,000 fixture messages
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHistory(
                        seed(
                          history.context.threadId === 'main' ? 'alternate' : 'main',
                          mode === 'reading' ? 120 : 400,
                        ),
                      );
                    }}
                  >
                    Switch thread
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAvailability(availability === 'denied' ? 'ready' : 'denied')}
                  >
                    {availability === 'denied' ? 'Restore access' : 'Revoke access'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (saved.current)
                        setRestore({
                          ...saved.current,
                          requestId: `restore-${++requestId.current}`,
                        });
                      else setReceipt('Scroll to save a reading position first.');
                    }}
                  >
                    Restore saved position
                  </Button>
                </div>
                <p role="status">{receipt}</p>
                <p>
                  Deterministic synthetic messages. The host supplies bounded pages and exact
                  revision scopes. This example does not send messages to a provider or save
                  history.
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
