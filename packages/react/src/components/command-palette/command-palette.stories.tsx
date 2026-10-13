import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandPalette } from './command-palette.js';
import type { CommandPaletteItem } from './command-palette.js';
import { useCommandPalette } from './use-command-palette.js';
import { markMatches } from './mark-matches.js';
import { Button } from '../button/button.js';

const jumps: CommandPaletteItem[] = [
  { id: 'journal', label: 'Journal', group: 'Sections', href: '/journal/', hint: 'Latest entries' },
  { id: 'maps', label: 'System maps', group: 'Sections', href: '/maps/', hint: 'Index' },
  { id: 'rag', label: 'RAG map', group: 'Maps', href: '/maps/rag/', keywords: ['retrieval'] },
  { id: 'agents', label: 'Agents map', group: 'Maps', href: '/maps/agents/' },
  { id: 'paths', label: 'Learning paths', group: 'Paths', href: '/paths/' },
];
const pages = [
  {
    title: 'Evaluating retrieval quality',
    href: '/journal/evals-retrieval/',
    excerpt: 'How to score retrieval before the generator sees it.',
  },
  {
    title: 'Agent handoff receipts',
    href: '/journal/handoff-receipts/',
    excerpt: 'Acknowledged ownership for every handoff.',
  },
  {
    title: 'Tracing agent runs',
    href: '/journal/tracing/',
    excerpt: 'Spans, costs and retries in one view.',
  },
];
async function search(query: string, signal: AbortSignal): Promise<CommandPaletteItem[]> {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 400);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
  return pages
    .filter((page) => `${page.title} ${page.excerpt}`.toLowerCase().includes(query.toLowerCase()))
    .map((page) => ({
      id: page.href,
      label: page.title,
      group: 'Pages',
      href: page.href,
      hint: 'Journal',
      description: markMatches(page.excerpt, query),
    }));
}

const meta = {
  title: 'Unseen UI/CommandPalette',
  component: CommandPalette,
  args: { items: jumps, label: 'Search the site' },
} satisfies Meta<typeof CommandPalette>;
export default meta;
type Story = StoryObj<typeof meta>;

function Opener() {
  const palette = useCommandPalette();
  return (
    <Button variant="outline" onClick={palette.open}>
      Search (Ctrl or ⌘ K)
    </Button>
  );
}

export const StaticItems: Story = {
  render: (args) => (
    <>
      <Opener />
      <CommandPalette {...args} onSelect={(item) => console.log('select', item.id)} />
    </>
  ),
};

function Searching() {
  const [last, setLast] = useState('');
  return (
    <>
      <Opener />
      <p>Last selection: {last || 'none'}</p>
      <CommandPalette
        items={jumps}
        search={search}
        onSelect={(item) => setLast(item.label)}
        trailingAction={(query) => ({
          id: 'all',
          label: `Search everything for "${query}"`,
          group: 'Search',
          href: `/search?q=${encodeURIComponent(query)}`,
        })}
      />
    </>
  );
}
export const AsyncResults: Story = { render: () => <Searching /> };

function Controlled() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <CommandPalette open={open} onOpenChange={setOpen} items={jumps} shortcut={false} />
    </>
  );
}
export const ControlledOpen: Story = { render: () => <Controlled /> };
