'use client';
import { useEffect, useMemo, useState } from 'react';
import { createLocalHost } from '@stackunseen/ui-core';
import type { LocalHost, LocalHostOptions } from '@stackunseen/ui-core';
import { fromAiSdkChat } from '@stackunseen/ui-core/ai-sdk';
import type {
  AiSdkMappingOptions,
  AiSdkMessage,
  AiSdkStatus,
  ChatApprovalDecision,
} from '@stackunseen/ui-core/ai-sdk';
import type { ChatControlledProps } from './components/chat/chat.js';

export { Chat } from './components/chat/chat.js';
export { ChatLauncher } from './components/chat/chat-launcher.js';
export type { ChatLauncherProps } from './components/chat/chat-launcher.js';
export type {
  ChatProps,
  ChatBaseProps,
  ChatControlledProps,
  ChatHostProps,
  ChatHost,
  ChatHostSnapshot,
  ChatStatus,
} from './components/chat/chat.js';
export type {
  LocalHost,
  LocalHostOptions,
  LocalHostSnapshot,
  LocalReply,
} from '@stackunseen/ui-core';
export { createLocalHost, defaultLocalReply } from '@stackunseen/ui-core';

/**
 * One local host for the life of the component. Pass the result to Chat as `host`.
 * Options are read once; recreate the component (change its key) to change them.
 */
export function useLocalHost(options?: LocalHostOptions): LocalHost {
  const host = useMemo(() => createLocalHost(options), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => host.dispose(), [host]);
  return host;
}

export type {
  AiSdkMappingOptions,
  AiSdkMessage,
  AiSdkPart,
  AiSdkStatus,
  ChatApprovalDecision,
  ChatApprovalRequest,
} from '@stackunseen/ui-core/ai-sdk';
export { fromAiSdkChat } from '@stackunseen/ui-core/ai-sdk';

/**
 * The parts of the Vercel AI SDK `useChat()` result that Chat needs. Declared structurally so this
 * package does not depend on the SDK; pass the object `useChat` returns.
 */
export interface AiSdkChatLike {
  messages: readonly AiSdkMessage[];
  status: AiSdkStatus;
  error?: { message: string } | undefined;
  sendMessage: (message: { text: string }) => unknown;
  stop: () => unknown;
  regenerate: () => unknown;
  addToolApprovalResponse?: (response: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => unknown;
}

/**
 * Chat props from an AI SDK chat: `<Chat {...useAiSdkChat(useChat())} />`. Messages, tool calls,
 * sources and approval requests are mapped on each render; the draft is kept here.
 */
export function useAiSdkChat(
  chat: AiSdkChatLike,
  options?: AiSdkMappingOptions,
): Pick<
  ChatControlledProps,
  | 'messages'
  | 'tools'
  | 'status'
  | 'sources'
  | 'approvals'
  | 'draft'
  | 'onDraftChange'
  | 'onSend'
  | 'onCancel'
  | 'onRetry'
  | 'onDecision'
> {
  const [draft, setDraft] = useState('');
  const mapped = useMemo(
    () =>
      fromAiSdkChat({ messages: chat.messages, status: chat.status, error: chat.error }, options),
    // Options are read when the chat changes; pass a stable object to change them.
    [chat.messages, chat.status, chat.error], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return {
    messages: mapped.messages,
    tools: mapped.tools,
    sources: mapped.sources,
    approvals: mapped.approvals,
    status: mapped.status,
    draft,
    onDraftChange: setDraft,
    onSend: (text: string) => {
      void chat.sendMessage({ text });
    },
    onCancel: () => {
      void chat.stop();
    },
    onRetry: () => {
      void chat.regenerate();
    },
    onDecision: chat.addToolApprovalResponse
      ? (decision: ChatApprovalDecision) => {
          void chat.addToolApprovalResponse!({
            id: decision.approvalId,
            approved: decision.approved,
          });
        }
      : undefined,
  };
}
