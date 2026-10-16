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

`npx @stackunseen/ui init` writes this component into your project (`--ai-sdk` for the AI SDK version and a Next.js route).

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

## Connect the Vercel AI SDK

`useAiSdkChat` turns the object `useChat()` returns into Chat props. Messages, tool calls, sources and approval requests are mapped on each render; Stop calls `stop()`, Regenerate calls `regenerate()`, and approving or rejecting a tool calls `addToolApprovalResponse({ id, approved })` with the approval id the server issued.

```tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import { renderMarkdownPart } from '@stackunseen/ui/markdown';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/chat.css';

export function Assistant() {
  const chat = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  return <Chat {...useAiSdkChat(chat)} title="Assistant" renderTextPart={renderMarkdownPart} />;
}
```

On the server, mark tools that need a person with `needsApproval` and stream UI messages as usual:

```ts
// app/api/chat/route.ts
import { convertToModelMessages, streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(request: Request) {
  const { messages } = await request.json();
  const result = streamText({
    model: 'openai/gpt-5-mini',
    messages: convertToModelMessages(messages),
    tools: {
      archive_accounts: tool({
        description: 'Archive inactive accounts',
        inputSchema: z.object({ accountIds: z.array(z.string()) }),
        needsApproval: true,
        execute: async ({ accountIds }) => archive(accountIds),
      }),
    },
  });
  return result.toUIMessageStreamResponse();
}
```

What the mapping does:

| AI SDK | Chat |
| --- | --- |
| `text` parts | Text, formatted as Markdown for assistant messages when `renderTextPart={renderMarkdownPart}` is passed |
| `reasoning` parts | Left out; only public output is shown |
| `tool-<name>` and `dynamic-tool` parts | Tool cards: input-streaming, running, needs review, complete, failed, denied |
| `approval-requested` | An approval card under the tool, with the server's `requestReason` as the impact text, "Risk not assessed" and no expiry unless `describeApproval` supplies them |
| `approval-responded` | The card locks as sending until the tool runs or is denied, then reads acknowledged |
| `source-url`, `source-document` | Citations and a source list |
| `file` | Shown as an attached file label |
| `status` submitted or streaming, error | Streaming with Stop, or failed with the error on the reply |

`useAiSdkChat(chat, { describeApproval })` lets you word the card per tool (title, target, impact, scopes, risk). The card's action digest is a short fingerprint of the tool input so a reader can tell two requests apart; the server must still check the approval id before executing.

The types are structural: this package does not import the AI SDK. They follow the `UIMessage` shape documented at ai-sdk.dev for AI SDK 6, and the v7 tool-approval docs (approvals a server rule decides carry `isAutomatic` and get no card). The mapping is unit-tested against that shape and demonstrated with a simulated `useChat` on the Chat page (state "AI SDK approval"); it has not been run against a live model in this repository.

## Markdown

Chat renders plain text by default so the chat entry stays small. Pass `renderTextPart={renderMarkdownPart}` from `@stackunseen/ui/markdown` to format replies (GitHub-flavoured Markdown, safe links, incomplete-stream repair). That entry needs its own peers; see Getting started.

## Your own tool views

`renderTool={(tool) => tool.name === 'weather' ? <WeatherCard data={tool.output} /> : undefined}` replaces the default card for the tools you name and keeps it for the rest. Approval cards still appear under a replaced tool view.

## Short-form data

Prototypes should not have to invent ids and revisions. `Message` accepts `{ role, text }` and `ToolCall` accepts `{ name }` plus anything else you know; `messageFrom` and `toolCallFrom` in `@stackunseen/ui-core` fill the rest (a tool with an `output` reads as succeeded, with an `error` as failed, otherwise running). Host data with ids and revisions passes through unchanged.

## What Chat does not do

- No network, model or storage. The host owns the conversation; the component renders it.
- No Markdown by default; see Markdown above.
- No virtualisation. For long histories with paging use `ConversationViewport` from `@stackunseen/ui/viewport` and compose the composer yourself.
- Attachments, model selection and toolbars are slots (`attachments`, `toolbar`) because uploads and model lists are host state.

## Styling

The surface fills `--ai-chat-height` (520px by default); set it on the element or a parent. `panel` draws a bordered card with a header; `plain` has no border or header for embedding in your own layout. All other tokens come from the theme.
