import { catalog } from './catalog';
import { galleryHref, readGalleryLocation } from './gallery-location';
import type { GalleryLocation } from './gallery-location';

export function componentSlug(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
export const componentHref = (name: string) => `/components/${componentSlug(name)}/`;
export const viewPaths = {
  components: '/components/',
  workbench: '/patterns/agent-workbench/',
  coding: '/patterns/coding-studio/',
  templates: '/templates/',
  theme: '/customize/',
  design: '/design/',
} as const;

export function siteGalleryHref(location: GalleryLocation) {
  if (location.view !== 'components') return viewPaths[location.view];
  const params = new URLSearchParams(galleryHref(location));
  params.delete('view');
  params.delete('component');
  params.delete('width');
  const defaults = readGalleryLocation(`?component=${location.component}`);
  if (location.style === defaults.style) params.delete('style');
  if (location.state === defaults.state) params.delete('state');
  return componentHref(location.component) + (params.size ? `?${params}` : '');
}

/** Compatibility with saved gallery links. Static hosts cannot redirect by query on their own. */
export function legacyDestination(search: string): string | undefined {
  const params = new URLSearchParams(search);
  if (!params.has('view') && !params.has('component')) return;
  if (params.get('view') === 'components' && !params.has('component')) return '/components/';
  if (params.has('component') && !catalog.some((entry) => entry.name === params.get('component')))
    return '/components/';
  return siteGalleryHref(readGalleryLocation(search));
}
