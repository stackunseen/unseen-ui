'use client';
import { useMemo } from 'react';
import { resolveVariant } from '@stackunseen/ui';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import { renderMarkdownPart } from '@stackunseen/ui/markdown';
import '@stackunseen/ui/chat.css';
import { useSimulatedChat } from './chat-ai-sdk-simulation';

export function ChatAiSdkSpecimen({
  presentation,
  onNotice,
  markdown = true,
  height = 560,
}: {
  presentation?: string;
  onNotice: (text: string) => void;
  /** Off where the page should not load the Markdown entry; emphasis markers are removed instead. */
  markdown?: boolean;
  height?: number;
}) {
  const chat = useSimulatedChat(onNotice);
  const plain = useMemo(
    () =>
      markdown
        ? chat
        : {
            ...chat,
            messages: chat.messages.map((message) => ({
              ...message,
              parts: message.parts.map((part) =>
                part.type === 'text'
                  ? { ...part, text: (part as { text: string }).text.replace(/\*\*|`/g, '') }
                  : part,
              ),
            })),
          },
    [chat, markdown],
  );
  return (
    <Chat
      {...useAiSdkChat(plain)}
      variant={resolveVariant('Chat', presentation)}
      title="Assistant"
      renderTextPart={markdown ? renderMarkdownPart : undefined}
      placeholder="Ask the simulated AI SDK chat…"
      style={{ ['--ai-chat-height' as string]: `${height}px` }}
    />
  );
}
