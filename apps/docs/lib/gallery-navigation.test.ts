import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import {
  componentSections,
  gallerySection,
  navigationGroup,
  sectionCatalog,
  sectionGroups,
} from './gallery-navigation';
import { isSiteSectionActive, siteNavigation } from './site-navigation';
describe('library collections', () => {
  it('places all 177 entries exactly once in a defined group', () => {
    expect(catalog).toHaveLength(177);
    const entries = componentSections.flatMap((section) => sectionCatalog(section));
    expect(entries).toHaveLength(catalog.length);
    expect(new Set(entries.map((entry) => entry.name)).size).toBe(catalog.length);
    expect(componentSections.map((section) => sectionCatalog(section).length)).toEqual([
      65, 93, 8, 11,
    ]);
    for (const section of componentSections) {
      const groups = sectionGroups(section);
      for (const entry of sectionCatalog(section)) expect(groups).toContain(navigationGroup(entry));
      for (const group of groups)
        expect(sectionCatalog(section).some((entry) => navigationGroup(entry) === group)).toBe(
          true,
        );
    }
  });
  it('distinguishes native data controls, bounded AI output and application compositions', () => {
    const names = (section: Parameters<typeof sectionCatalog>[0]) =>
      sectionCatalog(section).map((entry) => entry.name);
    expect(names('ui')).toEqual(
      expect.arrayContaining(['Table', 'DataGrid', 'MarkdownResponse', 'MarkdownCodeBlock']),
    );
    expect(names('ai')).toEqual(expect.arrayContaining(['Chart', 'CodeDiff', 'GeneratedUI']));
    expect(names('application')).toEqual(
      expect.arrayContaining(['PageHeader', 'MasterDetail', 'SettingsSaveCancel', 'UnsavedGuard']),
    );
    expect(names('marketing')).toEqual(
      expect.arrayContaining(['MarketingHero', 'MarketingFooter']),
    );
  });
  it('keeps full templates separate from focused AI recipes without changing old URLs', () => {
    for (const view of ['workbench', 'coding', 'templates'] as const)
      expect(gallerySection(view, catalog[0]!)).toBe('templates');
    expect(sectionCatalog('patterns')).toEqual([]);
    expect(siteNavigation.map(([label]) => label)).toEqual([
      'Components',
      'Patterns',
      'Getting Started',
      'Customize',
    ]);
    for (const path of ['/patterns/coding-studio/', '/patterns/recoverable-chat/', '/templates/'])
      expect(
        siteNavigation
          .filter(([, href]) => isSiteSectionActive(path, href))
          .map(([label]) => label),
      ).toEqual(['Patterns']);
    for (const path of ['/getting-started/', '/docs/integration/', '/docs/customization/'])
      expect(isSiteSectionActive(path, '/getting-started/')).toBe(true);
    // Each page lights up the section whose sidebar it shows, and only that one.
    for (const [path, label] of [
      ['/design/', 'Customize'],
      ['/customize/', 'Customize'],
      ['/tasks/', 'Components'],
      ['/tasks/ai-chat/', 'Components'],
      ['/components/button/', 'Components'],
    ] as const)
      expect(
        siteNavigation
          .filter(([, href]) => isSiteSectionActive(path, href))
          .map(([label]) => label),
      ).toEqual([label]);
  });
});
