'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AppearanceToggle,
  Button,
  CopyButton,
  Field,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  useStoredAppearance,
} from '@stackunseen/ui';
import type { Appearance } from '@stackunseen/ui';
import {
  CommandPalette,
  ShareMenu,
  TableOfContents,
  useCommandPalette,
  markMatches,
} from '@stackunseen/ui/navigation';
import type { CommandPaletteItem } from '@stackunseen/ui/navigation';
import '@stackunseen/ui/navigation.css';
import type { WebsiteSpecimenProps } from './website-specimen';

const jumps: CommandPaletteItem[] = [
  { id: 'journal', label: 'Journal', group: 'Sections', href: '#journal', hint: 'Latest entries' },
  { id: 'maps', label: 'System maps', group: 'Sections', href: '#maps', hint: 'Index' },
  { id: 'rag', label: 'RAG map', group: 'Maps', href: '#rag', keywords: ['retrieval'] },
  { id: 'agents', label: 'Agents map', group: 'Maps', href: '#agents' },
  { id: 'paths', label: 'Learning paths', group: 'Paths', href: '#paths' },
];
const pages = [
  {
    title: 'Evaluating retrieval quality',
    href: '#evals',
    excerpt: 'How to score retrieval before the generator sees it.',
  },
  {
    title: 'Agent handoff receipts',
    href: '#receipts',
    excerpt: 'Acknowledged ownership for every handoff.',
  },
  {
    title: 'Tracing agent runs',
    href: '#tracing',
    excerpt: 'Spans, costs and retries in one view.',
  },
];
async function search(query: string, signal: AbortSignal): Promise<CommandPaletteItem[]> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 350);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
  const lower = query.toLowerCase();
  return pages
    .filter((page) => `${page.title} ${page.excerpt}`.toLowerCase().includes(lower))
    .map((page) => ({
      id: page.href,
      label: page.title,
      group: 'Pages',
      href: page.href,
      hint: 'Journal',
      description: markMatches(page.excerpt, query),
    }));
}
const toc = [
  { id: 'toc-why', title: 'Why evals' },
  {
    id: 'toc-datasets',
    title: 'Datasets',
    items: [
      { id: 'toc-golden', title: 'Golden sets' },
      { id: 'toc-synthetic', title: 'Synthetic cases' },
    ],
  },
  { id: 'toc-scoring', title: 'Scoring' },
  { id: 'toc-reporting', title: 'Reporting' },
];

/**
 * The demo has no sections of its own to scroll to, so choosing a title marks it as the section
 * being read instead of changing the address to a heading that is not on this page.
 */
function TocExample({ children }: { children: (activeId: string) => ReactNode }) {
  const [activeId, setActiveId] = useState('toc-golden');
  return (
    <div
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#toc-"]');
        if (!link) return;
        event.preventDefault();
        setActiveId(link.hash.slice(1));
      }}
    >
      {children(activeId)}
    </div>
  );
}

function PaletteExample({ state }: { state: string }) {
  const palette = useCommandPalette();
  const [last, setLast] = useState('');
  return (
    <div className="generic-demo-actions" style={{ justifyContent: 'flex-start', margin: 0 }}>
      <Button variant="outline" onClick={palette.open}>
        Search (Ctrl or ⌘ K)
      </Button>
      <span className="generic-demo-status">
        {last ? `Selected ${last}` : 'Nothing selected yet.'}
      </span>
      <CommandPalette
        items={jumps}
        search={state === 'Async results' ? search : undefined}
        onSelect={(item) => setLast(item.label)}
        trailingAction={
          state === 'Async results'
            ? (query) => ({
                id: 'all',
                label: `Search everything for "${query}"`,
                group: 'Search',
                href: `#search-${encodeURIComponent(query)}`,
              })
            : undefined
        }
      />
    </div>
  );
}

function AppearanceExample({ state }: { state: string }) {
  const [stored, setStored] = useStoredAppearance({ storageKey: 'unseen-ui-example-appearance' });
  const [local, setLocal] = useState<Appearance>('light');
  const value = state === 'Stored' ? stored : local;
  const set = state === 'Stored' ? setStored : setLocal;
  return (
    <div className="generic-demo-actions" style={{ justifyContent: 'flex-start', margin: 0 }}>
      <AppearanceToggle
        variant={
          state === 'Segmented'
            ? 'segmented'
            : state === 'Switch'
              ? 'switch'
              : state === 'Subtle'
                ? 'subtle'
                : 'cycle'
        }
        value={value}
        onValueChange={set}
      />
      <span className="generic-demo-status">
        {state === 'Stored' ? `Stored in this browser: ${value}` : `Current value: ${value}`}
      </span>
    </div>
  );
}

export function WebsiteUtilitySpecimen({ name, state }: WebsiteSpecimenProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState('');
  if (name === 'CommandPalette') return <PaletteExample state={state} />;
  if (name === 'TableOfContents' && (state === 'Track' || state === 'Ticks'))
    return (
      <div style={{ maxWidth: 280, minHeight: state === 'Ticks' ? 220 : undefined }}>
        <TocExample>
          {(activeId) => (
            <TableOfContents
              label="Contents"
              variant={state === 'Track' ? 'track' : 'ticks'}
              items={toc}
              collapsible="never"
              activeId={activeId}
            />
          )}
        </TocExample>
        <p className="generic-demo-status">
          {state === 'Track'
            ? 'On a page, the dark stretch follows the sections on screen.'
            : 'Hover, focus or press the marks to see the titles. Pin it to the page edge for long reads.'}
        </p>
      </div>
    );
  if (name === 'TableOfContents')
    return (
      <div style={{ maxWidth: 280 }}>
        <TocExample>
          {(activeId) => (
            <TableOfContents
              // Named apart from this page's own "On this page" outline.
              label="Contents"
              items={toc}
              numbered={state !== 'Plain'}
              showReading={state !== 'Plain'}
              collapsible={state === 'Collapsible' ? 'always' : 'narrow'}
              activeId={state === 'Plain' ? undefined : activeId}
            />
          )}
        </TocExample>
        <p className="generic-demo-status">
          Choose a title to mark it as the section being read. On a page, it follows your scrolling.
        </p>
      </div>
    );
  if (name === 'ShareMenu')
    return (
      <ShareMenu
        url="https://unseenui.com/components/share-menu/"
        title="ShareMenu · Unseen UI"
        text="Share the current page without tracking parameters."
        presentation={state === 'Menu' ? 'menu' : 'inline'}
        targets={
          state === 'Custom targets'
            ? [
                'copy',
                {
                  id: 'bluesky',
                  label: 'Bluesky',
                  href: 'https://bsky.app/intent/compose?text=Unseen%20UI',
                },
              ]
            : undefined
        }
      />
    );
  if (name === 'CopyButton')
    return (
      <div className="generic-demo-actions" style={{ justifyContent: 'flex-start', margin: 0 }}>
        <CopyButton
          value="npm install @stackunseen/ui"
          label={state === 'Icon only' ? 'Copy install command' : 'Copy install command'}
          iconOnly={state === 'Icon only'}
          variant={state === 'Primary' ? 'primary' : state === 'Icon only' ? 'ghost' : 'outline'}
        />
        <code>npm install @stackunseen/ui</code>
      </div>
    );
  if (name === 'InputGroup')
    return (
      <form
        style={{ maxWidth: 440 }}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(email ? `Subscribed ${email}` : 'Enter an email first.');
        }}
      >
        <Field
          label={state === 'Search' ? 'Search the journal' : 'Email address'}
          description={state === 'Search' ? undefined : 'One email when a new entry lands.'}
          error={state === 'Invalid' ? 'Enter a valid email address.' : undefined}
        >
          <InputGroup
            shape={state === 'Pill' || state === 'Default' ? 'pill' : 'control'}
            attach={state === 'Inset' || state === 'Search' ? 'inset' : 'flush'}
            size={state === 'Pill' || state === 'Default' ? 'touch' : 'default'}
          >
            {state === 'Search' && <InputGroupAddon>🔍</InputGroupAddon>}
            <Input
              type={state === 'Search' ? 'search' : 'email'}
              placeholder={state === 'Search' ? 'Titles, topics, summaries' : 'you@company.com'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <InputGroupButton type="submit" variant={state === 'Search' ? 'outline' : 'primary'}>
              {state === 'Search' ? 'Search' : 'Subscribe'}
            </InputGroupButton>
          </InputGroup>
        </Field>
        <p className="generic-demo-status" role="status">
          {submitted}
        </p>
      </form>
    );
  return <AppearanceExample state={state} />;
}
