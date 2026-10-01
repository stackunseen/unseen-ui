import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { gallerySection, sectionCatalog, sectionLabels } from './gallery-navigation';

describe('template gallery navigation', () => {
  it('places templates in Patterns while retaining four sections and 93 component entries', () => {
    expect(gallerySection('templates', catalog[0]!)).toBe('patterns');
    expect(Object.keys(sectionLabels)).toEqual(['ui', 'ai', 'patterns', 'customize']);
    expect(sectionCatalog('patterns')).toEqual([]);
    expect(catalog).toHaveLength(93);
    expect(sectionCatalog('ui')).toHaveLength(44);
    expect(sectionCatalog('ai')).toHaveLength(49);
  });
});
