export const siteNavigation = [
  ['Components', '/components/'],
  ['Patterns', '/patterns/'],
  ['Getting Started', '/getting-started/'],
  ['Customize', '/customize/'],
] as const;
/** Which top-level section a page belongs to: the one whose sidebar the page shows. */
export function isSiteSectionActive(path: string, href: string): boolean {
  if (href === '/getting-started/')
    return path.startsWith('/getting-started/') || path.startsWith('/docs/');
  if (href === '/patterns/') return path.startsWith('/patterns') || path.startsWith('/templates');
  // Task pages group components by job; they are reached from the component catalog.
  if (href === '/components/') return path.startsWith('/components') || path.startsWith('/tasks');
  // Design foundations sits in the Customize sidebar beside Theme studio.
  if (href === '/customize/') return path.startsWith('/customize') || path.startsWith('/design');
  return path.startsWith(href.replace(/\/$/, ''));
}
