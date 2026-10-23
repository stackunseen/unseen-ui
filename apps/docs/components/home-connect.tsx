import Link from 'next/link';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { HomeConnectCode } from './home-connect-code';

const files = [
  {
    file: 'assistant.tsx',
    label: 'With the AI SDK',
    language: 'tsx',
    code: `'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/chat.css';

export function Assistant() {
  const chat = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  return <Chat {...useAiSdkChat(chat)} title="Assistant" />;
}`,
  },
  {
    file: 'demo.tsx',
    label: 'No backend yet',
    language: 'tsx',
    code: `'use client';
import { Chat, useLocalHost } from '@stackunseen/ui/chat';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/chat.css';

// A stand-in server with scripted replies. Swap in your own when you're ready.
export function Demo() {
  const host = useLocalHost({ suggestions: ['Summarize the plan'] });
  return <Chat host={host} title="Assistant" />;
}`,
  },
  {
    file: 'terminal',
    label: 'Install',
    language: 'sh',
    code: `npm install @stackunseen/ui

# Or let it write a working chat into your Next.js or Vite app
npx @stackunseen/ui init`,
  },
] as const;

/** Homepage: what wiring it up looks like, before the reader has to open the docs. */
export function HomeConnect() {
  return (
    <section className="home-connect" aria-labelledby="home-connect-title">
      <div className="home-connect-copy">
        <h2 id="home-connect-title">One component, connected to your stack.</h2>
        <p>
          Keep the AI SDK&apos;s <code>useChat</code> and your server route, or start with a local
          stand-in and swap in your server later. Tool calls, approvals and sources come along.
        </p>
        <ul>
          <li>
            <Link href="/docs/integration/">
              Connect to your app <ArrowRightIcon width={15} height={15} aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link href="/components/chat/">
              See the Chat guide <ArrowRightIcon width={15} height={15} aria-hidden="true" />
            </Link>
          </li>
        </ul>
        <p className="home-connect-note">
          Moving from AI Elements? It is being deprecated at the end of November 2026.{' '}
          <Link href="/docs/migrate-from-ai-elements/">See how each component maps</Link>.
        </p>
      </div>
      {/* The file names always run across the top, leaving the code the full column width. */}
      <HomeConnectCode
        className="home-connect-code"
        label="Example files"
        files={files}
        copy
        narrowBreakpoint={100000}
      />
    </section>
  );
}
