'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Tabs } from '@stackunseen/ui';
import { Snippet } from '@stackunseen/ui/devtools';
import '@stackunseen/ui/devtools.css';

const ways = [
  {
    value: 'npm',
    label: 'npm package',
    note: 'Every component from one package. Import the stylesheet once and wrap your app in AITheme.',
    commands: ['npm install @stackunseen/ui react@^19.3.0 react-dom@^19.3.0'],
    more: ['#1-install-from-npm', 'Install steps'],
  },
  {
    value: 'init',
    label: 'Starter',
    note: 'Writes a working chat into a Next.js or Vite app. Add --ai-sdk for the AI SDK version with its route.',
    commands: ['npx @stackunseen/ui init'],
    more: ['#other-ways-to-start', 'What it writes'],
  },
  {
    value: 'shadcn',
    label: 'shadcn',
    note: 'For projects that already use shadcn/ui. Each starter writes one small file; the components stay in the package.',
    commands: [
      'npx shadcn@latest add https://unseenui.com/r/chat.json',
      'npx shadcn@latest add https://unseenui.com/r/theme.json',
    ],
    more: ['#shadcn', 'Registry starters'],
  },
  {
    value: 'mcp',
    label: 'Coding agent',
    note: 'Give Claude Code, Cursor or Codex the catalog over MCP: search, list, and read any component with its props and usage.',
    commands: ['claude mcp add --transport http unseen-ui https://unseenui.com/api/mcp'],
    more: ['/docs/coding-agents/', 'Agent setup'],
  },
] as const;

/** The four ways to start, side by side, each with the command to copy. */
export function InstallChooser() {
  const [value, setValue] = useState<string>('npm');
  return (
    <div className="install-chooser">
      <Tabs
        label="Ways to install"
        value={value}
        onValueChange={setValue}
        items={ways.map((way) => ({
          value: way.value,
          label: way.label,
          content: (
            <div className="install-chooser-panel">
              <p>{way.note}</p>
              {way.commands.map((command) => (
                <Snippet key={command} code={command} prefix="$" label="Command" />
              ))}
              <Link prefetch={false} href={way.more[0]}>
                {way.more[1]}
              </Link>
            </div>
          ),
        }))}
      />
    </div>
  );
}
