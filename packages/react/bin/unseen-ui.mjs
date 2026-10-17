#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import process from 'node:process';
import console from 'node:console';

const help = `Usage: npx @stackunseen/ui init [options]

Adds a working Chat component to a React project. Nothing is installed and no
existing file is changed unless you pass --force.

Options
  --ai-sdk     Write a Chat wired to the Vercel AI SDK, plus a Next.js API route
  --dir <dir>  Folder for the component (default: src/components or components)
  --force      Overwrite files that already exist
  --dry-run    Print what would be written without writing
  --help       Show this help
`;

const localChat = `'use client';
import { Chat, useLocalHost } from '@stackunseen/ui/chat';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/chat.css';

/**
 * A working chat on a simulated host, so you can see it before anything is connected.
 * Replace useLocalHost with your own host, or run \`npx @stackunseen/ui init --ai-sdk\`.
 */
export function Assistant() {
  const host = useLocalHost({ suggestions: ['Summarize the plan', 'Search notes for renewals'] });
  return <Chat host={host} title="Assistant" />;
}
`;

const aiSdkChat = `'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { Chat, useAiSdkChat } from '@stackunseen/ui/chat';
import { renderMarkdownPart } from '@stackunseen/ui/markdown';
import '@stackunseen/ui/styles.css';
import '@stackunseen/ui/chat.css';

/** Chat on the Vercel AI SDK. Tools marked needsApproval on the server show an approval card. */
export function Assistant() {
  const chat = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  return <Chat {...useAiSdkChat(chat)} title="Assistant" renderTextPart={renderMarkdownPart} />;
}
`;

const aiSdkRoute = `import { convertToModelMessages, streamText, tool } from 'ai';
import { z } from 'zod';

// Set the model and its API key for your provider. The example tool waits for a person.
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
        execute: async ({ accountIds }) => ({ archived: accountIds.length }),
      }),
    },
  });
  return result.toUIMessageStreamResponse();
}
`;

/** The files init writes; the site's shadcn registry is generated from the same text. */
export const templates = { localChat, aiSdkChat, aiSdkRoute };

/** Paths as people type them, with forward slashes on every platform. */
const posix = (path) => path.split('\\').join('/');

function parse(argv) {
  const options = { command: argv[0], aiSdk: false, force: false, dryRun: false, dir: undefined };
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--ai-sdk') options.aiSdk = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.command = 'help';
    else if (arg === '--dir') options.dir = argv[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function detect(root) {
  let manifest = {};
  try {
    manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  } catch {
    throw new Error('No package.json here. Run this in the root of a React project.');
  }
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  const src = existsSync(join(root, 'src'));
  const appDir = ['src/app', 'app'].find((dir) => existsSync(join(root, dir)));
  return {
    next: Boolean(dependencies.next),
    vite: Boolean(dependencies.vite),
    hasUi: Boolean(dependencies['@stackunseen/ui']),
    componentsDir: src ? 'src/components' : 'components',
    sourceDir: src ? 'src' : '.',
    appDir,
  };
}

export function run(argv, root = process.cwd(), log = console.log) {
  const options = parse(argv);
  if (options.command !== 'init') {
    log(help);
    return options.command === 'help' || options.command === undefined ? 0 : 1;
  }
  const project = detect(root);
  const files = [
    {
      path: join(options.dir ?? project.componentsDir, 'assistant.tsx'),
      content: options.aiSdk ? aiSdkChat : localChat,
    },
  ];
  if (options.aiSdk) {
    if (!project.next)
      log('No Next.js found: write your own /api/chat route from the example in the Chat guide.');
    else
      files.push({
        path: join(project.appDir ?? 'app', 'api', 'chat', 'route.ts'),
        content: aiSdkRoute,
      });
  }
  const skipped = [];
  for (const file of files) {
    const target = join(root, file.path);
    if (existsSync(target) && !options.force) {
      skipped.push(file.path);
      continue;
    }
    if (options.dryRun) log(`would write ${posix(file.path)}`);
    else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content);
      log(`wrote ${posix(file.path)}`);
    }
  }
  for (const path of skipped) log(`kept ${posix(path)} (exists; pass --force to overwrite)`);
  const packages = [
    project.hasUi ? undefined : '@stackunseen/ui',
    ...(options.aiSdk ? ['@ai-sdk/react', 'ai', 'zod'] : []),
  ].filter(Boolean);
  log('');
  if (packages.length) log(`Install: npm install ${packages.join(' ')}`);
  const from = relative(project.appDir ?? project.sourceDir, files[0].path)
    .replace(/\\/g, '/')
    .replace(/\.tsx$/, '');
  log(`Render it: import { Assistant } from '${from.startsWith('.') ? from : `./${from}`}';`);
  log('Guide: https://unseenui.com/components/chat/');
  return 0;
}

const invoked =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (invoked) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
