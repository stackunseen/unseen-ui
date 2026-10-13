'use client';
import { useState } from 'react';
import {
  AppearanceToggle,
  Button,
  CopyButton,
  Field,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  ProgressRing,
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
        variant={state === 'Segmented' ? 'segmented' : 'cycle'}
        value={value}
        onValueChange={set}
      />
      <span className="generic-demo-status">
        {state === 'Stored' ? `Stored in this browser: ${value}` : `Host value: ${value}`}
      </span>
    </div>
  );
}

export function WebsiteUtilitySpecimen({ name, state }: WebsiteSpecimenProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState('');
  if (name === 'CommandPalette') return <PaletteExample state={state} />;
  if (name === 'TableOfContents')
    return (
      <div style={{ maxWidth: 280 }}>
        <TableOfContents
          items={toc}
          numbered={state !== 'Plain'}
          showReading={state !== 'Plain'}
          collapsible={state === 'Collapsible' ? 'always' : 'narrow'}
          activeId={state === 'Plain' ? undefined : 'toc-golden'}
        />
        <p className="generic-demo-status">
          The active heading is pinned here; on a page it follows the reading line.
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
          value="npm install @stackunseen/ui@alpha"
          label={state === 'Icon only' ? 'Copy install command' : 'Copy install command'}
          iconOnly={state === 'Icon only'}
          variant={state === 'Primary' ? 'primary' : state === 'Icon only' ? 'ghost' : 'outline'}
        />
        <code>npm install @stackunseen/ui@alpha</code>
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
  if (name === 'ProgressRing')
    return (
      <div
        className="generic-demo-actions"
        style={{ justifyContent: 'flex-start', margin: 0, gap: 24 }}
      >
        <ProgressRing
          label="Checklist"
          value={state === 'Complete' ? 9 : state === 'Indeterminate' ? null : 3}
          max={9}
          valueText={state === 'Indeterminate' ? undefined : `${state === 'Complete' ? 9 : 3} of 9`}
          size={state === 'Large' ? 'lg' : state === 'Small' ? 'sm' : 'default'}
        />
      </div>
    );
  return <AppearanceExample state={state} />;
}
