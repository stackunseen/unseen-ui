import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chat, createLocalHost } from '@stackunseen/ui/chat';
import type { ChatStatus } from '@stackunseen/ui/chat';
import type { MessageData } from '@stackunseen/ui-core';

function manualSchedule() {
  const queue: { fn: () => void; cancelled: boolean }[] = [];
  return {
    schedule(fn: () => void) {
      const entry = { fn, cancelled: false };
      queue.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    flush() {
      let n = 0;
      while (queue.length && n++ < 1000) {
        const entry = queue.shift()!;
        if (!entry.cancelled) entry.fn();
      }
    },
  };
}

describe('Chat with a host', () => {
  it('sends a prompt, streams the reply, offers suggestions and regenerates', async () => {
    const user = userEvent.setup();
    const clock = manualSchedule();
    const host = createLocalHost({
      schedule: clock.schedule,
      charsPerTick: 100,
      suggestions: ['Summarize the plan'],
      reply: (prompt) => ({ text: `Reply to ${prompt}`, suggestions: ['Go on'] }),
    });
    render(<Chat host={host} title="Demo" />);
    expect(screen.getByText('Start a conversation')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Summarize the plan' }));
    expect(host.getSnapshot().status).toBe('streaming');
    expect(screen.getByRole('article', { name: 'user message' })).toHaveTextContent(
      'Summarize the plan',
    );
    act(() => clock.flush());
    expect(screen.getByRole('article', { name: 'assistant message' })).toHaveTextContent(
      'Reply to Summarize the plan',
    );
    expect(screen.getByRole('button', { name: 'Go on' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(host.getSnapshot().status).toBe('streaming');
    act(() => clock.flush());
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.type(screen.getByRole('textbox'), 'hello{Enter}');
    act(() => clock.flush());
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('log', { name: 'Demo transcript' })).toBeInTheDocument();
  });

  it('stops a streaming reply and offers a retry', async () => {
    const user = userEvent.setup();
    const clock = manualSchedule();
    const host = createLocalHost({
      schedule: clock.schedule,
      charsPerTick: 1,
      reply: () => 'A long reply',
    });
    render(<Chat host={host} />);
    await user.type(screen.getByRole('textbox'), 'go{Enter}');
    await user.click(screen.getByRole('button', { name: /stop|cancel/i }));
    expect(host.getSnapshot().status).toBe('cancelled');
    expect(screen.getByText('Stopped. The partial reply is kept above.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    act(() => clock.flush());
    expect(screen.getByRole('article', { name: 'assistant message' })).toHaveTextContent(
      'A long reply',
    );
  });
});

describe('Chat controlled', () => {
  function Harness({ onSend }: { onSend: (text: string) => void }) {
    const [draft, setDraft] = useState('');
    const messages: MessageData[] = [
      { id: 'u1', role: 'user', text: 'Hi', state: 'complete', revision: 0 },
      { id: 'a1', role: 'assistant', text: 'Hello', state: 'complete', revision: 0 },
    ];
    const status: ChatStatus = 'complete';
    return (
      <Chat
        variant="plain"
        messages={messages}
        status={status}
        draft={draft}
        onDraftChange={setDraft}
        onSend={onSend}
      />
    );
  }
  it('renders host messages and forwards the trimmed draft', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Harness onSend={onSend} />);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('heading')).toBeNull();
    await user.type(screen.getByRole('textbox'), '  next question  {Enter}');
    expect(onSend).toHaveBeenCalledExactlyOnceWith('next question');
  });
});
