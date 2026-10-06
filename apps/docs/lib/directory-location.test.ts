import { describe, expect, it } from 'vitest';
import { directorySearch, readDirectoryLocation } from './directory-location';

describe('component directory location', () => {
  it('restores direct queries and rejects unknown collections', () => {
    expect(readDirectoryLocation('?collection=marketing&q=site+navigation')).toEqual({
      collection: 'marketing',
      query: 'site navigation',
    });
    expect(readDirectoryLocation('?collection=unknown')).toEqual({ collection: 'all', query: '' });
  });
  it('preserves unrelated settings when filtering and resets search to all collections', () => {
    const filtered = directorySearch('?q=save&tab=code', { collection: 'application' });
    expect(readDirectoryLocation(filtered)).toEqual({ collection: 'application', query: 'save' });
    expect(new URLSearchParams(filtered).get('tab')).toBe('code');
    const searched = directorySearch(filtered, { collection: 'all', query: 'hero & footer' });
    expect(readDirectoryLocation(searched)).toEqual({ collection: 'all', query: 'hero & footer' });
    expect(directorySearch(searched, { query: '' })).toBe('?tab=code');
  });
});
