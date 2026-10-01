import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRuntime, messageText } from '@ai-interaction/core';
import type { MessageData, MessagePart, Runtime, TextMessagePart } from '@ai-interaction/core';

import { Message, RuntimeProvider, useRuntimeSelector } from '@ai-interaction/react';
import { renderMarkdownPart } from '@ai-interaction/react/markdown';
import { initialSnapshot, source, tool } from '../../apps/docs/lib/fixtures';

const closed: TextMessagePart = {
  id: 'intro',
  type: 'text',
  format: 'markdown',
  text: '**Completed** section.',
  state: 'complete',
};

const active: TextMessagePart = {
  id: 'answer',
  type: 'text',
  format: 'markdown',
  text: 'A partial',
  state: 'streaming',
};

const message = (parts: MessagePart[] = [closed, active]): MessageData => ({
  id: 'rich',
  role: 'assistant',
  state: 'streaming',
  revision: 0,
  parts,
});

const live: Runtime[] = [];

function runtime(value = message()) {
  const base = initialSnapshot();
  const result = createRuntime({
    ...base,
    schemaVersion: 2,
    run: { ...base.run, lifecycle: 'running' },
    messages: [value],
  });
  live.push(result);
  return result;
}

function event(
  store: Runtime,
  type: string,
  payload: unknown,
  sequence = store.getSnapshot().lastSequence + 1,
) {
  const snapshot = store.getSnapshot();
  return {
    schemaVersion: snapshot.schemaVersion,
    eventId: `event-${sequence}`,
    streamId: snapshot.streamId,
    sequence,
    runId: snapshot.run.id,
    threadId: snapshot.run.threadId,
    attemptId: snapshot.run.attemptId,
    occurredAt: '2026-09-30T00:00:00Z',
    type,
    payload,
  };
}

afterEach(() => {
  live.splice(0).forEach((store) => store.dispose());
});

describe('message part composition', () => {
  it.each(['plain', 'bubble', 'panel'] as const)(
    'renders ordered mixed parts, UTC metadata and one message status in %s',
    (variant) => {
      const value: MessageData = {
        ...message([
          closed,
          { id: 't', type: 'tool', toolCallId: tool.id },
          {
            id: 's',
            type: 'source',
            sourceId: source.id,
            version: source.version,
            locator: source.locator,
          },
          { id: 'f', type: 'attachment', attachmentId: 'file', version: '1' },
        ]),
        state: 'complete',
        createdAt: '2026-09-30T00:05:00Z',
      };
      const { container } = render(
        <Message
          renderTextPart={renderMarkdownPart}
          value={value}
          variant={variant}
          sources={[source]}
          tools={[tool]}
          attachments={[
            {
              id: 'file',
              version: '1',
              value: {
                name: 'Review.txt',
                state: 'ready',
                preview: { kind: 'text', text: 'Local file content' },
              },
            },
          ]}
        />,
      );
      expect(
        [...container.querySelectorAll('[data-message-part-id]')].map((node) =>
          node.getAttribute('data-message-part-id'),
        ),
      ).toEqual(['intro', 't', 's', 'f']);
      expect(screen.getByText('Completed').tagName).toBe('STRONG');
      expect(screen.getByText('2026-09-30 00:05 UTC')).toHaveAttribute('datetime', value.createdAt);
      expect(screen.getByRole('button', { name: /Source 1:/ })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Preview Review.txt' })).toBeVisible();
      expect(screen.getAllByText('Response complete')).toHaveLength(1);
    },
  );
  it('keeps completed text renderers and their DOM stable across runtime deltas', () => {
    const store = runtime();
    const renderText = vi.fn((part: TextMessagePart) => <p>{part.text}</p>);
    function Subscriber() {
      const value = useRuntimeSelector((snapshot) => snapshot.messages[0]!);
      return <Message value={value} renderTextPart={renderText} />;
    }
    const { container } = render(
      <RuntimeProvider runtime={store}>
        <Subscriber />
      </RuntimeProvider>,
    );
    const stableNode = container.querySelector('[data-message-part-id="intro"]');
    const before = renderText.mock.calls.filter(([part]) => part.id === 'intro').length;
    for (let i = 0; i < 50; i++) {
      act(() => {
        store.ingest(
          event(store, 'message.part.delta', {
            id: 'rich',
            partId: 'answer',
            offset: 9 + i,
            text: '.',
          }),
        );
      });
    }
    expect(renderText.mock.calls.filter(([part]) => part.id === 'intro')).toHaveLength(before);
    expect(container.querySelector('[data-message-part-id="intro"]')).toBe(stableNode);
    expect(messageText(store.getSnapshot().messages[0]!)).toContain('.'.repeat(50));
  });
  it('resolves changed/revoked sources without leaking an obsolete excerpt', async () => {
    const user = userEvent.setup();
    const value: MessageData = {
      ...message([
        {
          id: 's',
          type: 'source',
          sourceId: source.id,
          version: source.version,
          locator: source.locator,
        },
      ]),
      state: 'complete',
    };
    const { rerender } = render(<Message value={value} sources={[source]} />);
    await user.click(screen.getByRole('button', { name: /Source 1:/ }));
    expect(screen.getByText(source.excerpt!)).toBeVisible();
    rerender(<Message value={value} sources={[{ ...source, access: 'revoked' }]} />);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.queryByText(source.excerpt!)).toBeNull();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /Source 1:/ })).toHaveFocus();
    rerender(<Message value={value} sources={[{ ...source, version: 'new-version' }]} />);
    await user.click(screen.getByRole('button', { name: 'Source 1: Source unavailable' }));
    expect(screen.getByText(/Source version or location unavailable/)).toBeVisible();
  });
  it('keeps rich failures distinct from completion and retains partial text', () => {
    render(
      <Message
        renderTextPart={renderMarkdownPart}
        value={{
          ...message([{ ...active, state: 'interrupted' }]),
          state: 'failed',
          error: { code: 'TIMEOUT', message: 'Request timed out.' },
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Response failed. Received content retained.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Request timed out.');
    expect(screen.getByText('A partial')).toBeVisible();
    expect(screen.queryByText('Response complete')).toBeNull();
  });
});
