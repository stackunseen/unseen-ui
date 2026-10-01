import { describe, expect, it } from 'vitest';
import { changeGalleryLocation, galleryHref, readGalleryLocation } from './gallery-location';

describe('template gallery locations', () => {
  it('roundtrips the template route with a clean URL', () => {
    const location = readGalleryLocation('?view=templates');
    expect(location.view).toBe('templates');
    expect(galleryHref(location)).toBe('?view=templates');
    expect(readGalleryLocation(galleryHref(location))).toEqual(location);
  });

  it('navigates from an existing component preview and back to a valid component', () => {
    const component = readGalleryLocation(
      '?component=Modal&style=sheet&state=Default&tab=code&width=375',
    );
    const template = changeGalleryLocation(component, { view: 'templates' });
    expect(template.view).toBe('templates');
    expect(galleryHref(template)).toBe('?view=templates');
    expect(
      changeGalleryLocation(template, { view: 'components', component: 'Table' }),
    ).toMatchObject({
      view: 'components',
      component: 'Table',
      tab: 'preview',
      compare: false,
    });
    expect(readGalleryLocation(galleryHref(component))).toEqual(component);
  });

  it.each(['workbench', 'coding', 'theme', 'design'] as const)(
    'preserves the existing %s route',
    (view) => {
      const location = readGalleryLocation(`?view=${view}`);
      expect(location.view).toBe(view);
      expect(readGalleryLocation(galleryHref(location))).toEqual(location);
    },
  );
});
