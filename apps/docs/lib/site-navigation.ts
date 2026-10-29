/** The four sections of the site, in header order. Each owns the sidebar its pages show. */
export const siteNavigation = [
  ['Components', '/components/'],
  ['Templates', '/templates/'],
  ['Docs', '/docs/'],
  ['Customize', '/customize/'],
] as const;
/** Which top-level section a page belongs to: the one whose sidebar the page shows. */
export function isSiteSectionActive(path: string, href: string): boolean {
  // Getting started is the first guide of the docs.
  if (href === '/docs/') return path.startsWith('/docs/') || path.startsWith('/getting-started/');
  // Patterns are smaller compositions, listed with the whole applications.
  if (href === '/templates/') return path.startsWith('/templates') || path.startsWith('/patterns');
  // Task pages group components by job; they are reached from the component catalog.
  if (href === '/components/') return path.startsWith('/components') || path.startsWith('/tasks');
  // Design foundations sits in the Customize sidebar beside Theme studio.
  if (href === '/customize/') return path.startsWith('/customize') || path.startsWith('/design');
  return path.startsWith(href.replace(/\/$/, ''));
}
