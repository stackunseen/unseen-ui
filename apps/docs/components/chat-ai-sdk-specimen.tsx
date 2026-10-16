'use client';
import { useEffect, useRef, useState } from 'react';
import { resolveVariant } from '@stackunseen/ui';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import type { AiSdkChatLike, AiSdkMessage } from '@stackunseen/ui/chat';
import { renderMarkdownPart } from '@stackunseen/ui/markdown';
import '@stackunseen/ui/chat.css';

const opening: AiSdkMessage[] = [
  {
    id: 'u1',
    role: 'user',
    parts: [{ type: 'text', text: 'Archive the accounts with no activity for 90 days.' }],
  },
  {
    id: 'a1',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'I found **2 accounts** with no activity for 90 days. Archiving needs your approval.',
        state: 'done',
      },
      {
        type: 'tool-archive_accounts',
        toolCallId: 'call-1',
        state: 'approval-requested',
        input: { accountIds: ['acme-sandbox', 'demo-works'], reason: 'inactive_90_days' },
        approval: {
          id: 'approval-1',
          requestReason: 'Both accounts become read-only. An administrator can restore them.',
        },
      },
    ],
  },
];

/**
 * A stand-in for the AI SDK `useChat()` result: the same fields and method names, answered by
 * timers instead of a server. The real hook is used the same way: `<Chat {...useAiSdkChat(useChat())} />`.
 */
function useSimulatedChat(onNotice: (text: string) => void): AiSdkChatLike {
  const [messages, setMessages] = useState<AiSdkMessage[]>(opening);
  const [status, setStatus] = useState<AiSdkChatLike['status']>('ready');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));
  const reply = (id: string, text: string) => {
    setStatus('streaming');
    let shown = 0;
    const step = () => {
      shown = Math.min(text.length, shown + 14);
      setMessages((list) => {
        const rest = list.filter((message) => message.id !== id);
        const existing = list.find((message) => message.id === id);
        const parts = (existing?.parts ?? []).filter((part) => part.type !== 'text');
        return [
          ...rest,
          {
            id,
            role: 'assistant',
            parts: [
              ...parts,
              {
                type: 'text',
                text: text.slice(0, shown),
                state: shown < text.length ? 'streaming' : 'done',
              },
            ],
          },
        ];
      });
      if (shown < text.length) later(45, step);
      else setStatus('ready');
    };
    later(45, step);
  };
  return {
    messages,
    status,
    sendMessage: ({ text }) => {
      const n = messages.length;
      setMessages((list) => [
        ...list,
        { id: `u${n}`, role: 'user', parts: [{ type: 'text', text }] },
      ]);
      setStatus('submitted');
      later(500, () =>
        reply(
          `a${n}`,
          'This page simulates the AI SDK, so no model answered. Connect `useChat()` from `@ai-sdk/react` and the same component streams real replies.',
        ),
      );
    },
    stop: () => {
      timers.current.forEach(clearTimeout);
      setStatus('ready');
    },
    regenerate: () =>
      onNotice('Regenerate asks the server for a new attempt; this simulation has none.'),
    addToolApprovalResponse: ({ id, approved }) => {
      onNotice(
        `addToolApprovalResponse({ id: '${id}', approved: ${approved} }) sent to the simulated chat.`,
      );
      setMessages((list) =>
        list.map((message) => ({
          ...message,
          parts: message.parts.map((part) =>
            (part as { approval?: { id: string } }).approval?.id === id
              ? {
                  ...part,
                  state: 'approval-responded',
                  // The SDK keeps the request fields and adds the decision.
                  approval: { ...(part as { approval: { id: string } }).approval, approved },
                }
              : part,
          ),
        })),
      );
      setStatus('submitted');
      later(900, () => {
        setMessages((list) =>
          list.map((message) => ({
            ...message,
            parts: message.parts.map((part) =>
              (part as { approval?: { id: string } }).approval?.id === id
                ? approved
                  ? {
                      ...part,
                      state: 'output-available',
                      output: { archived: 2, restorableUntil: '2026-11-15' },
                    }
                  : { ...part, state: 'output-denied' }
                : part,
            ),
          })),
        );
        reply(
          'a-result',
          approved
            ? 'Done. **2 accounts** are archived and read-only. An administrator can restore them until 15 November.'
            : 'Understood. Nothing was archived.',
        );
      });
    },
  };
}

export function ChatAiSdkSpecimen({
  presentation,
  onNotice,
}: {
  presentation?: string;
  onNotice: (text: string) => void;
}) {
  const chat = useSimulatedChat(onNotice);
  return (
    <Chat
      {...useAiSdkChat(chat)}
      variant={resolveVariant('Chat', presentation)}
      title="Assistant"
      renderTextPart={renderMarkdownPart}
      placeholder="Ask the simulated AI SDK chat…"
      style={{ ['--ai-chat-height' as string]: '560px' }}
    />
  );
}
