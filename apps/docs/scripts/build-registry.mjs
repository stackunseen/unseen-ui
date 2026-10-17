// Builds the shadcn registry served at /r/: install with `npx shadcn@latest add <url>` or through
// an @unseen namespace. Items install the published npm package (pinned to this release) and
// write small starter files; the components themselves stay in the package, so updates arrive as
// versions. Chat files come from the init CLI's templates, so both write the same code.
//   node apps/docs/scripts/build-registry.mjs          writes apps/docs/public/r/
//   node apps/docs/scripts/build-registry.mjs --check  fails when the written files are stale
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const out = resolve(here, '../public/r');
const { templates } = await import(
  pathToFileURL(join(root, 'packages/react/bin/unseen-ui.mjs')).href
);
const { version } = JSON.parse(readFileSync(join(root, 'packages/react/package.json'), 'utf8'));
const pkg = `@stackunseen/ui@${version}`;
const origin = 'https://unseenui.com';

// Source files in apps/docs/registry are typechecked with the docs app.
const themeFile = readFileSync(
  resolve(here, '../registry/unseen/theme/unseen-theme.tsx'),
  'utf8',
).replace(/\r\n/g, '\n');

const items = [
  {
    name: 'chat',
    type: 'registry:block',
    title: 'Chat',
    description:
      'A working chat on a simulated host: transcript, streaming reply, tool rows, suggestions, stop and retry. Swap the host for your server or the AI SDK.',
    dependencies: [pkg],
    files: [
      {
        path: 'registry/unseen/chat/assistant.tsx',
        type: 'registry:component',
        target: '@components/assistant.tsx',
        content: templates.localChat,
      },
    ],
    docs: `Render <Assistant /> from components/assistant. Guide: ${origin}/components/chat/`,
    categories: ['ai', 'chat'],
  },
  {
    name: 'chat-ai-sdk',
    type: 'registry:block',
    title: 'Chat on the Vercel AI SDK',
    description:
      'Chat wired to useChat, with tool approvals as approval cards, Markdown replies and a Next.js route whose example tool waits for a person.',
    dependencies: [pkg, '@ai-sdk/react', 'ai', 'zod'],
    files: [
      {
        path: 'registry/unseen/chat-ai-sdk/assistant.tsx',
        type: 'registry:component',
        target: '@components/assistant.tsx',
        content: templates.aiSdkChat,
      },
      {
        path: 'registry/unseen/chat-ai-sdk/route.ts',
        type: 'registry:file',
        target: '~/app/api/chat/route.ts',
        content: templates.aiSdkRoute,
      },
    ],
    docs: `Set your model and provider key in app/api/chat/route.ts (move it under src/app if your app lives there), then render <Assistant />. Guide: ${origin}/patterns/ai-sdk-chat/`,
    categories: ['ai', 'chat', 'ai-sdk'],
  },
  {
    name: 'theme',
    type: 'registry:component',
    title: 'Theme',
    description:
      'A scoped theme provider with the base stylesheet: wrap your app or a section in <UnseenTheme>.',
    dependencies: [pkg],
    files: [
      {
        path: 'registry/unseen/theme/unseen-theme.tsx',
        type: 'registry:component',
        target: '@components/unseen-theme.tsx',
        content: themeFile,
      },
    ],
    docs: `Wrap your app in <UnseenTheme> from components/unseen-theme. Customize: ${origin}/customize/`,
    categories: ['theme'],
  },
];

const author = 'Stack Unseen';
const files = new Map();
for (const item of items)
  files.set(
    `${item.name}.json`,
    `${JSON.stringify({ $schema: 'https://ui.shadcn.com/schema/registry-item.json', ...item, author }, null, 2)}\n`,
  );
files.set(
  'registry.json',
  `${JSON.stringify(
    {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: 'unseen-ui',
      homepage: origin,
      items: items.map(({ files: itemFiles, ...item }) => ({
        ...item,
        author,
        files: itemFiles.map(({ path, type, target }) => ({ path, type, target })),
      })),
    },
    null,
    2,
  )}\n`,
);

if (process.argv.includes('--check')) {
  const stale = [...files].filter(
    ([name, text]) =>
      !existsSync(join(out, name)) || readFileSync(join(out, name), 'utf8') !== text,
  );
  if (stale.length) {
    console.error(
      `Stale registry files: ${stale.map(([name]) => name).join(', ')}. Run node apps/docs/scripts/build-registry.mjs`,
    );
    process.exit(1);
  }
  console.log(`Registry up to date: ${files.size} files`);
} else {
  mkdirSync(out, { recursive: true });
  for (const [name, text] of files) writeFileSync(join(out, name), text);
  console.log(`Wrote ${files.size} registry files to apps/docs/public/r/ for ${pkg}`);
}
