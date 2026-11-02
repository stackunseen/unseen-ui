'use client';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ArrowUpRight, LayoutGrid, List, Search } from 'lucide-react';
import Link from 'next/link';
import {
  componentSections,
  sectionLabels,
  collectionDescriptions,
  sectionGroups,
  isReleaseSection,
  releaseSections,
} from '../lib/component-collections';
import type { ComponentSection } from '../lib/component-collections';
import { directorySearch, groupAnchor, readDirectoryLocation } from '../lib/directory-location';
import { componentTasks } from '../lib/tasks';
import { agentOperationsCollection } from '../lib/agent-operations';
import { matchesQuery } from '../lib/search';
import { newComponents } from '../lib/new-components';
export interface DirectoryEntry {
  name: string;
  href: string;
  description: string;
  section: ComponentSection;
  group: string;
  terms: string;
  /** Base path of the captured thumbnail, without `-light.webp` or `-dark.webp`. */
  preview?: string;
}
export function ComponentDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );
  const { query, collection: section, view } = readDirectoryLocation(search);
  const compositionView = section !== 'all' && !isReleaseSection(section);
  const releaseEntries = entries.filter((entry) => isReleaseSection(entry.section));
  const visibleEntries = compositionView ? entries : releaseEntries;
  function update(patch: Parameters<typeof directorySearch>[1], replace = false) {
    const href =
      window.location.pathname +
      directorySearch(window.location.search, patch) +
      window.location.hash;
    window.history[replace ? 'replaceState' : 'pushState'](null, '', href);
    window.dispatchEvent(new Event('directory:navigate'));
  }
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.location.hash === '#component-search') input.current?.focus();
    const collection = window.location.hash.slice(1);
    if (
      (collection === 'application' || collection === 'marketing') &&
      readDirectoryLocation(window.location.search).collection === 'all'
    )
      update({ collection }, true);
  }, []);
  const filtered = visibleEntries.filter(
    (entry) => (section === 'all' || entry.section === section) && matchesQuery(entry.terms, query),
  );
  return (
    <>
      {compositionView && (
        <p className="collection-note">
          Additional composition examples, kept at their existing URLs.{' '}
          <button
            className="web-text-link"
            type="button"
            onClick={() => update({ collection: 'all', query: '' })}
          >
            Browse the component catalog
          </button>
        </p>
      )}
      <div className="directory-tools">
        <label id="component-search" className="directory-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search the component catalog</span>
          <input
            ref={input}
            type="search"
            placeholder={compositionView ? 'Search these examples' : 'Search all components'}
            value={query}
            onChange={(event) =>
              update(
                { query: event.target.value, collection: compositionView ? section : 'all' },
                true,
              )
            }
          />
        </label>
        <div className="directory-filters" role="group" aria-label="Component collection">
          {(['all', ...releaseSections] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={section === value}
              onClick={() => update({ collection: value })}
            >
              {value === 'all' ? 'All components' : sectionLabels[value]}{' '}
              <span className="directory-filter-count">
                {
                  releaseEntries.filter((entry) => value === 'all' || entry.section === value)
                    .length
                }
              </span>
            </button>
          ))}
        </div>
      </div>
      {!compositionView && (
        <div className="directory-tasks" role="group" aria-label="Start by task">
          <span className="directory-tasks-label">Start by task</span>
          {componentTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              aria-pressed={query.trim().toLowerCase() === task.label.toLowerCase()}
              title={task.description}
              onClick={() =>
                update({
                  query: query.trim().toLowerCase() === task.label.toLowerCase() ? '' : task.label,
                  collection: 'all',
                })
              }
            >
              {task.label}
            </button>
          ))}
        </div>
      )}
      <div className="directory-count-row">
        <p className="directory-count" role="status">
          {filtered.length}{' '}
          {compositionView
            ? filtered.length === 1
              ? 'example'
              : 'examples'
            : filtered.length === 1
              ? 'component'
              : 'components'}
          {query && ` matching “${query}”`}
        </p>
        <div className="directory-view" role="group" aria-label="Layout">
          <button
            type="button"
            aria-pressed={view === 'gallery'}
            onClick={() => update({ view: 'gallery' }, true)}
          >
            <LayoutGrid size={16} aria-hidden="true" />
            Gallery
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => update({ view: 'list' }, true)}
          >
            <List size={16} aria-hidden="true" />
            List
          </button>
        </div>
      </div>
      {section === 'all' && !query && (
        <section
          className="directory-collection directory-featured"
          id={agentOperationsCollection.id}
          aria-labelledby="agent-operations-title"
        >
          <h2 id="agent-operations-title">{agentOperationsCollection.title}</h2>
          <p className="directory-collection-description">
            {agentOperationsCollection.description}
          </p>
          <p className="directory-featured-links">
            <Link href={agentOperationsCollection.pattern.href}>
              {agentOperationsCollection.pattern.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href={agentOperationsCollection.task.href}>
              {agentOperationsCollection.task.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </p>
          <div className="directory-group" data-view={view}>
            <EntryList
              view={view}
              entries={agentOperationsCollection.components
                .map((name) => entries.find((entry) => entry.name === name))
                .filter((entry): entry is DirectoryEntry => Boolean(entry))}
            />
          </div>
        </section>
      )}
      {componentSections.map((collection) => {
        const items = filtered.filter((entry) => entry.section === collection);
        if (!items.length) return null;
        const groups = sectionGroups(collection).filter((group) =>
          items.some((entry) => entry.group === group),
        );
        return (
          <section className="directory-collection" id={collection} key={collection}>
            <h2>{sectionLabels[collection]}</h2>
            <p className="directory-collection-description">{collectionDescriptions[collection]}</p>
            {groups.map((group) => {
              const members = items
                .filter((entry) => entry.group === group)
                .sort((first, second) => first.name.localeCompare(second.name, 'en'));
              return (
                <div
                  className="directory-group"
                  id={groupAnchor(collection, group)}
                  key={group}
                  data-view={view}
                >
                  <h3>
                    {group} <span>{members.length}</span>
                  </h3>
                  <EntryList view={view} entries={members} />
                </div>
              );
            })}
          </section>
        );
      })}
      {!filtered.length && (
        <div className="directory-empty">
          <h2>No matching components</h2>
          <p>Try a shorter name or search for a category, such as forms.</p>
          <button
            className="web-button secondary"
            onClick={() => {
              update({ query: '', collection: 'all' });
              input.current?.focus();
            }}
          >
            Clear search
          </button>
        </div>
      )}
    </>
  );
}
/** The tiles or rows of one group; the featured set and every category share them. */
function EntryList({ view, entries }: { view: string; entries: DirectoryEntry[] }) {
  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.name}>
          <Link prefetch={false} href={entry.href}>
            {view === 'gallery' && (
              <span className="directory-thumb" aria-hidden="true">
                {entry.preview ? (
                  <>
                    <img
                      className="directory-thumb-light"
                      src={`${entry.preview}-light.webp`}
                      alt=""
                      width={720}
                      height={450}
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      className="directory-thumb-dark"
                      src={`${entry.preview}-dark.webp`}
                      alt=""
                      width={720}
                      height={450}
                      loading="lazy"
                      decoding="async"
                    />
                  </>
                ) : (
                  <span className="directory-thumb-name">{entry.name}</span>
                )}
              </span>
            )}
            <span className="directory-text">
              <strong>
                {entry.name}
                {newComponents.has(entry.name) && <span className="new-badge">New</span>}
                <ArrowUpRight size={16} aria-hidden="true" />
              </strong>
              <span>{entry.description}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener('directory:navigate', listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener('directory:navigate', listener);
  };
}
