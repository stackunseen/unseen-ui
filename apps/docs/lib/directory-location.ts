import { componentSections } from './component-collections';
import type { ComponentSection } from './component-collections';
export type DirectoryView = 'gallery' | 'list';
export interface DirectoryLocation {
  collection: 'all' | ComponentSection;
  query: string;
  view: DirectoryView;
}
export function readDirectoryLocation(search: string): DirectoryLocation {
  const params = new URLSearchParams(search);
  const collection = params.get('collection');
  return {
    collection: componentSections.some((value) => value === collection)
      ? (collection as ComponentSection)
      : 'all',
    query: params.get('q') ?? '',
    view: params.get('view') === 'list' ? 'list' : 'gallery',
  };
}
export function directorySearch(search: string, patch: Partial<DirectoryLocation>): string {
  const next = { ...readDirectoryLocation(search), ...patch };
  const params = new URLSearchParams(search);
  if (next.collection === 'all') params.delete('collection');
  else params.set('collection', next.collection);
  if (next.query) params.set('q', next.query);
  else params.delete('q');
  if (next.view === 'list') params.set('view', 'list');
  else params.delete('view');
  return params.size ? `?${params}` : '';
}
/** Anchor id for a catalog group, shared with the category rail. */
export function groupAnchor(section: string, group: string) {
  return `group-${section}-${group
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}
