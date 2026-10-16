'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import '@stackunseen/ui/chat.css';
import { useSimulatedChat } from './chat-ai-sdk-simulation';

/**
 * The homepage's working example: an assistant asks before it archives anything. It is the same
 * Chat a host wires to `useChat()`, answered here by a local simulation without a model.
 */
export function HomeHeroDemo() {
  const [notice, setNotice] = useState('');
  const chat = useSimulatedChat(setNotice);
  // The homepage does not load the Markdown entry, so emphasis markers are removed from the text.
  const plain = useMemo(
    () => ({
      ...chat,
      messages: chat.messages.map((message) => ({
        ...message,
        parts: message.parts.map((part) =>
          part.type === 'text'
            ? { ...part, text: (part as { text: string }).text.replace(/\*\*|`/g, '') }
            : part,
        ),
      })),
    }),
    [chat],
  );
  return (
    <figure className="home-hero-demo">
      <Chat
        {...useAiSdkChat(plain)}
        title="Assistant"
        placeholder="Ask the simulated assistant…"
        style={{ ['--ai-chat-height' as string]: '460px' }}
      />
      <figcaption>
        <span>
          Chat, ToolCall and ApprovalCard on a simulated AI SDK chat. Approve or reject to see the
          receipt settle.
        </span>
        <Link href="/components/chat/">How it works</Link>
      </figcaption>
      <p className="sr-only" role="status">
        {notice}
      </p>
    </figure>
  );
}
