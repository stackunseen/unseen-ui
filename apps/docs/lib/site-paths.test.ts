import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { readGalleryLocation } from './gallery-location';
import { componentSlug, legacyDestination, siteGalleryHref } from './site-paths';
describe('site route identity and old gallery links', () => {
  it('has unique stable slugs for every catalog entry', () => {
    expect(new Set(catalog.map((entry) => componentSlug(entry.name))).size).toBe(catalog.length);
    expect(catalog.map((entry) => entry.name)).toContain('DataGrid');
    expect(catalog.map((entry) => entry.name)).toContain('MarketingHero');
    expect(componentSlug('MCPServerCard')).toBe('mcp-server-card');
  });
  it('preserves valid fixture choices when migrating a saved link', () => {
    const old =
      '?view=components&component=Modal&style=sheet&state=Default&tab=code&compare=true&width=375';
    expect(legacyDestination(old)).toBe('/components/modal/?style=sheet&tab=code&compare=true');
  });
  it('maps workspaces to dedicated routes and rejects unknown component selections', () => {
    expect(legacyDestination('?view=coding')).toBe('/patterns/coding-studio/');
    expect(legacyDestination('?view=templates')).toBe('/templates/');
    expect(legacyDestination('?component=missing')).toBe('/components/');
    expect(legacyDestination('?campaign=home')).toBeUndefined();
    expect(siteGalleryHref(readGalleryLocation('?component=Input'))).toBe('/components/input/');
  });
});
