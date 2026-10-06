import { catalog, catalogGroup } from './catalog';
import type { CatalogEntry } from './catalog';
export { releaseSections, isReleaseSection } from './component-collections';
export function isReleaseComponent(entry: CatalogEntry): boolean {
  const group = catalogGroup(entry);
  return group !== 'Application patterns' && group !== 'Marketing blocks';
}
// Keep the full catalog for saved routes, specimens and existing package APIs.
export const releaseCatalog = catalog.filter(isReleaseComponent);
export const compositionCatalog = catalog.filter((entry) => !isReleaseComponent(entry));
export const featuredApp = {
  name: 'SaaS admin',
  href: '/templates/saas-admin/',
} as const;
