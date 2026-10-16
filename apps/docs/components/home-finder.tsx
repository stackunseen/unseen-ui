'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import type { DirectoryEntry } from './component-directory';
import { searchScore } from '../lib/search';

const suggested = {
  all: ['Button', 'Modal', 'PromptInput', 'ApprovalCard'],
  ui: ['Button', 'Input', 'Modal', 'Tabs'],
  ai: ['PromptInput', 'Message', 'ApprovalCard', 'ToolCall'],
};
export function HomeFinder({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState<'all' | 'ui' | 'ai'>('all');
  const matches = entries
    .filter((entry) => collection === 'all' || entry.section === collection)
    .map((entry) => ({ entry, score: searchScore(entry.name, entry.terms, query) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .map((item) => item.entry);
  const items = query.trim()
    ? matches.slice(0, 8)
    : suggested[collection].flatMap((name) => entries.filter((entry) => entry.name === name));
  return (
    <section className="home-finder" aria-labelledby="home-find-title">
      <div className="home-finder-heading">
        <h2 id="home-find-title">Find a component</h2>
        <Link href="/components/">
          Browse all {entries.length} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <label className="home-search">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Find a component in the library</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search buttons, dialogs, tools…"
        />
      </label>
      <div className="home-finder-filters" role="group" aria-label="Homepage component collection">
        {(['all', 'ui', 'ai'] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={collection === value}
            onClick={() => setCollection(value)}
          >
            {value === 'all'
              ? 'All'
              : `${value.toUpperCase()} · ${entries.filter((entry) => entry.section === value).length}`}
          </button>
        ))}
        <span role="status">
          {query.trim() ? `${matches.length} matches` : 'A few places to start'}
        </span>
      </div>
      <ul className="home-found-components">
        {items.map((entry) => (
          <li key={entry.name}>
            <Link href={entry.href}>
              <span>
                <strong>{entry.name}</strong>
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
              <small>{entry.group}</small>
            </Link>
          </li>
        ))}
      </ul>
      {!matches.length && (
        <p className="home-search-empty">No match yet. Try “forms” or “prompt”.</p>
      )}
    </section>
  );
}
