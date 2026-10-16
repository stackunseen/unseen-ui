'use client';
import { useEffect } from 'react';
import { resolveVariant } from '@stackunseen/ui';
import { Chat, useLocalHost } from '@stackunseen/ui/chat';
import '@stackunseen/ui/chat.css';

export function ChatSpecimen({
  state,
  presentation,
  onNotice,
}: {
  state: string;
  presentation?: string;
  onNotice: (text: string) => void;
}) {
  const host = useLocalHost({
    suggestions: ['Summarize the plan', 'Search notes for renewals', 'Fail on purpose'],
    now: () => '2026-10-16T10:00:00.000Z',
  });
  useEffect(() => {
    if (state === 'Mid conversation' || state === 'Tool call' || state === 'Failed') {
      host.reset();
      host.send(
        state === 'Tool call'
          ? 'Search notes for renewals'
          : state === 'Failed'
            ? 'Fail on purpose'
            : 'Summarize the plan',
      );
    }
    return host.subscribe(() => {
      const snapshot = host.getSnapshot();
      if (snapshot.status === 'complete') onNotice('The local host finished a simulated reply.');
      if (snapshot.status === 'failed') onNotice('The local host simulated a failed reply.');
    });
  }, [host, state, onNotice]);
  return (
    <Chat
      host={host}
      variant={resolveVariant('Chat', presentation)}
      title="Assistant"
      placeholder="Ask the local host…"
      style={{ ['--ai-chat-height' as string]: '460px' }}
    />
  );
}
