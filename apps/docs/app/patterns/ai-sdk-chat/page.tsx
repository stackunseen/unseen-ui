import Link from 'next/link';
import { ExamplePage } from '../../../components/example-page';
import { AiSdkChatRecipe } from '../../../components/ai-recipes/ai-sdk-chat-recipe';
import { pageMetadata } from '../../../lib/site-seo';
export const metadata = pageMetadata(
  'Chat on the Vercel AI SDK',
  'Connect Unseen UI Chat to the Vercel AI SDK useChat hook with tool approvals that wait for a person, Markdown replies and custom tool views.',
  '/patterns/ai-sdk-chat/',
);

const client = `'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import { renderMarkdownPart } from '@stackunseen/ui/markdown';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/chat.css';

export function Assistant() {
  const chat = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    // Send the conversation back once every pending approval has an answer.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  return <Chat {...useAiSdkChat(chat)} title="Assistant" renderTextPart={renderMarkdownPart} />;
}`;

const server = `// app/api/chat/route.ts
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
        // The SDK pauses here and streams an approval request to the client.
        needsApproval: true,
        execute: async ({ accountIds }) => archive(accountIds),
      }),
    },
  });
  return result.toUIMessageStreamResponse();
}`;

const wording = `<Chat
  {...useAiSdkChat(chat, {
    describeApproval: ({ name, input }) =>
      name === 'archive_accounts'
        ? {
            title: 'Archive accounts?',
            target: 'CRM · Production',
            scopes: ['accounts:archive'],
            risk: 'medium',
          }
        : {},
  })}
  renderTool={(tool) => (tool.name === 'weather' ? <WeatherCard data={tool.output} /> : undefined)}
/>`;

export default function Page() {
  return (
    <ExamplePage
      title="Chat on the Vercel AI SDK"
      description="A chat whose tools ask before they run. The demo below answers with a simulated useChat; the code is what you write against a real one."
      backHref="/patterns/"
      backLabel="All patterns"
    >
      <AiSdkChatRecipe client={client} server={server} wording={wording} />
      <p className="collection-note">
        Start from these two files in your project:{' '}
        <code>npx shadcn@latest add https://unseenui.com/r/chat-ai-sdk.json</code>, or{' '}
        <code>npx @stackunseen/ui init --ai-sdk</code>.
      </p>
      <p className="collection-note">
        Full mapping table and what is and is not verified: the{' '}
        <Link href="/components/chat/">Chat page</Link>. Components used:{' '}
        <Link href="/components/chat/">Chat</Link>,{' '}
        <Link href="/components/tool-call/">ToolCall</Link>,{' '}
        <Link href="/components/approval-card/">ApprovalCard</Link>,{' '}
        <Link href="/components/markdown-response/">MarkdownResponse</Link>.
      </p>
    </ExamplePage>
  );
}
