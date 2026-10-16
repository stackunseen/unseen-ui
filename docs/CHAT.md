# Chat in five minutes

`@stackunseen/ui/chat` is the fastest way to see the conversation components working together: one `Chat` surface (transcript, streaming reply, tool cards, suggestions, composer, stop and retry) and a local host that streams deterministic replies so nothing has to be connected first.

```tsx
'use client';
import { Chat, useLocalHost } from '@stackunseen/ui/chat';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/chat.css';

export function Demo() {
  const host = useLocalHost({ suggestions: ['Summarize the plan', 'Search notes for renewals'] });
  return <Chat host={host} title="Assistant" />;
}
```

Type "search notes for renewals" to see a tool call run before the text, "fail" to see a failed turn with Retry, or press Stop while a reply streams. The local host never calls a model and its replies say so.

## Two ways to drive it

| Mode | Props | When |
| --- | --- | --- |
| Host | `host: ChatHost` | Prototypes, demos, tests, and real apps whose client keeps the conversation in a store. The component subscribes with `useSyncExternalStore`, keeps only the draft text locally, and calls `send`, `cancel` and `retry` on the host. |
| Controlled | `messages`, `tools?`, `status`, `suggestions?`, `draft`, `onDraftChange`, `onSend`, `onCancel?`, `onRetry?` | When your framework already owns every value (for example a form library or a server-driven state tree). |

`ChatHost` is small on purpose:

```ts
interface ChatHost {
  getSnapshot(): { messages: MessageData[]; tools?: ToolCallData[]; status: ChatStatus; suggestions?: string[] };
  subscribe(listener: () => void): () => void;
  send(text: string): unknown;
  cancel?(): void;
  retry?(): void;
}
```

Implement it over your server (SSE, WebSocket or polling): append the user message, stream the assistant message with increasing `revision`, add tool calls to `tools` and reference them from the message's `parts`, and set `status`. The transcript, actions and composer follow. `createLocalHost` in `@stackunseen/ui-core` is a complete reference implementation of this contract in about two hundred lines.

## Short-form data

Prototypes should not have to invent ids and revisions. `Message` accepts `{ role, text }` and `ToolCall` accepts `{ name }` plus anything else you know; `messageFrom` and `toolCallFrom` in `@stackunseen/ui-core` fill the rest (a tool with an `output` reads as succeeded, with an `error` as failed, otherwise running). Host data with ids and revisions passes through unchanged.

## What Chat does not do

- No network, model or storage. The host owns the conversation; the component renders it.
- No Markdown by default. Pass `renderTextPart` with `MarkdownResponse` from `@stackunseen/ui/markdown` when you want formatting.
- No virtualisation. For long histories with paging use `ConversationViewport` from `@stackunseen/ui/viewport` and compose the composer yourself.
- Attachments, model selection and toolbars are slots (`attachments`, `toolbar`) because uploads and model lists are host state.

## Styling

The surface fills `--ai-chat-height` (520px by default); set it on the element or a parent. `panel` draws a bordered card with a header; `plain` has no border or header for embedding in your own layout. All other tokens come from the theme.
