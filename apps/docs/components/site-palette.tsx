'use client';
import { CommandPalette, useCommandPalette } from '@stackunseen/ui/navigation';
import type { CommandPaletteItem } from '@stackunseen/ui/navigation';
import '@stackunseen/ui/navigation.css';
import { Search } from 'lucide-react';
import { matchesQuery, searchScore } from '../lib/search';
import type { SiteSearchItem } from '../lib/search-index';
import { siteNavigation } from '../lib/site-navigation';

/** The places the palette lists before anything is typed. */
const pages: CommandPaletteItem[] = [
  ...siteNavigation.map(([label, href]) => ({ id: `nav-${href}`, label, href, group: 'Pages' })),
  {
    id: 'nav-/getting-started/',
    label: 'Getting started',
    href: '/getting-started/',
    group: 'Pages',
  },
  { id: 'nav-/patterns/', label: 'Patterns', href: '/patterns/', group: 'Pages' },
  { id: 'nav-/tasks/', label: 'Tasks', href: '/tasks/', group: 'Pages' },
  { id: 'nav-/docs/changelog/', label: 'Changelog', href: '/docs/changelog/', group: 'Pages' },
];

let index: Promise<SiteSearchItem[]> | null = null;
function loadIndex(signal: AbortSignal): Promise<SiteSearchItem[]> {
  index ??= fetch('/search-index.json', { signal })
    .then((response) => {
      if (!response.ok) throw new Error(`search index: ${response.status}`);
      return response.json() as Promise<SiteSearchItem[]>;
    })
    .catch((error) => {
      index = null;
      throw error;
    });
  return index;
}

/** The same matcher as the catalog search: meaning-based, with one typo forgiven. */
async function searchSite(query: string, signal: AbortSignal): Promise<CommandPaletteItem[]> {
  const items = await loadIndex(signal);
  return items
    .filter((item) => matchesQuery(item.terms, query))
    .map((item) => ({ item, score: searchScore(item.label, item.terms, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
    .map(({ item }) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      group: item.group,
      hint: item.hint,
      description: item.description,
    }));
}

/**
 * Ctrl/Cmd+K on every page: components, patterns, templates, tasks and guides, searched the
 * way the catalog index searches. Items are router links, so Enter navigates client-side.
 */
export function SitePalette() {
  return (
    <CommandPalette
      label="Search the site"
      placeholder="Search components, patterns and guides…"
      items={pages}
      staticLimit={4}
      search={searchSite}
      trailingAction={(query) => ({
        id: 'catalog-search',
        label: `Search the catalog for “${query}”`,
        group: 'More',
        href: `/components/?q=${encodeURIComponent(query)}`,
      })}
      emptyState="No matches. Try a component name or a job, such as approvals."
    />
  );
}

/** The header's search control: opens the palette, and names the shortcut for keyboard users. */
export function SitePaletteButton() {
  const palette = useCommandPalette();
  return (
    <button
      type="button"
      className="web-search"
      aria-label="Search the site"
      aria-keyshortcuts="Control+K Meta+K"
      title="Search (Ctrl+K)"
      onClick={palette.open}
    >
      <Search size={16} aria-hidden="true" />
      <span className="web-search-label">Search</span>
      <kbd className="web-search-key" aria-hidden="true">
        ⌘K
      </kbd>
    </button>
  );
}
