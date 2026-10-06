import { componentSections } from './component-collections';
import type { ComponentSection } from './component-collections';
export interface DirectoryLocation {
  collection: 'all' | ComponentSection;
  query: string;
}
export function readDirectoryLocation(search: string): DirectoryLocation {
  const params = new URLSearchParams(search);
  const collection = params.get('collection');
  return {
    collection: componentSections.some((value) => value === collection)
      ? (collection as ComponentSection)
      : 'all',
    query: params.get('q') ?? '',
  };
}
export function directorySearch(search: string, patch: Partial<DirectoryLocation>): string {
  const next = { ...readDirectoryLocation(search), ...patch };
  const params = new URLSearchParams(search);
  if (next.collection === 'all') params.delete('collection');
  else params.set('collection', next.collection);
  if (next.query) params.set('q', next.query);
  else params.delete('q');
  return params.size ? `?${params}` : '';
}
