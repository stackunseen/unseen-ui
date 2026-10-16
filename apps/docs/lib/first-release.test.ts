import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { compositionCatalog, releaseCatalog, releaseSections, featuredApp } from './first-release';
import { componentSection } from './gallery-navigation';
import { componentHref, legacyDestination } from './site-paths';

describe('first-release discovery and saved routes', () => {
  it('counts UI and AI controls while retaining every composition in the full catalog', () => {
    expect(releaseSections).toEqual(['ui', 'ai']);
    expect(releaseCatalog).toHaveLength(149);
    expect(
      releaseSections.map(
        (section) => releaseCatalog.filter((entry) => componentSection(entry) === section).length,
      ),
    ).toEqual([67, 82]);
    expect(compositionCatalog).toHaveLength(16);
    expect([...releaseCatalog, ...compositionCatalog]).toHaveLength(catalog.length);
    expect(releaseCatalog.some((entry) => entry.name === 'DataGrid')).toBe(true);
  });
  it('preserves the existing component URLs and query migration for deferred examples', () => {
    for (const entry of compositionCatalog) {
      expect(legacyDestination(`?view=components&component=${entry.name}&tab=code`)).toBe(
        `${componentHref(entry.name)}?tab=code`,
      );
    }
    expect(featuredApp.href).toBe('/templates/saas-admin/');
    expect(legacyDestination('?view=templates')).toBe('/templates/');
    expect(legacyDestination('?view=workbench')).toBe('/patterns/agent-workbench/');
  });
});
